import 'server-only'

import { ServiceUnavailableError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import type {
  RateLimitFallbackMode,
  RateLimitResult,
} from '@/lib/rateLimitShared'
import {
  resolveRateLimitFallbackMode,
} from '@/lib/rateLimitShared'
import { db } from '@/server/db/client'

export type {
  RateLimitFallbackMode,
  RateLimitResult,
} from '@/lib/rateLimitShared'
export {
  buildRateLimitIdentifier,
  getClientIp,
  rateLimitResponse,
  resolveRateLimitFallbackMode,
} from '@/lib/rateLimitShared'

export interface RateLimitOptions {
  max: number
  windowMs: number
}

export interface RateLimitBehavior {
  fallback?: RateLimitFallbackMode
  unavailableMessage?: string
}

interface Entry {
  count: number
  resetAt: number
}

interface RateLimitRow {
  hits: number
  window_start: Date
  window_ms: number
}

const fallbackStore = new Map<string, Entry>()
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000
const DB_RETENTION_MS = 24 * 60 * 60 * 1000
const DEFAULT_UNAVAILABLE_MESSAGE =
  'Le service est temporairement indisponible. Veuillez reessayer dans un instant.'

let lastCleanupAt = 0

function takeMemoryRateLimit(
  namespace: string,
  identifier: string,
  options: RateLimitOptions,
): RateLimitResult {
  const key = `${namespace}:${identifier}`
  const now = Date.now()

  let entry = fallbackStore.get(key)
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + options.windowMs }
    fallbackStore.set(key, entry)
  }

  entry.count++

  return {
    ok: entry.count <= options.max,
    remaining: Math.max(0, options.max - entry.count),
    resetAt: entry.resetAt,
  }
}

async function sha256Hex(input: string): Promise<string> {
  const buffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(input),
  )

  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function maybeCleanupDb(now: number): Promise<void> {
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) return
  lastCleanupAt = now

  try {
    await db`
      DELETE FROM api_rate_limits
      WHERE updated_at < ${new Date(now - DB_RETENTION_MS)}
    `
  } catch (error) {
    logger.warn('Failed to prune rate limit rows', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

async function takeDbRateLimit(
  namespace: string,
  identifierHash: string,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const rows = await db<RateLimitRow[]>`
    INSERT INTO api_rate_limits (
      namespace,
      identifier_hash,
      window_start,
      window_ms,
      hits,
      updated_at
    )
    VALUES (
      ${namespace},
      ${identifierHash},
      NOW(),
      ${options.windowMs},
      1,
      NOW()
    )
    ON CONFLICT (namespace, identifier_hash) DO UPDATE
    SET
      hits = CASE
        WHEN api_rate_limits.window_start
          + (api_rate_limits.window_ms * INTERVAL '1 millisecond') <= NOW()
          THEN 1
        ELSE api_rate_limits.hits + 1
      END,
      window_start = CASE
        WHEN api_rate_limits.window_start
          + (api_rate_limits.window_ms * INTERVAL '1 millisecond') <= NOW()
          THEN NOW()
        ELSE api_rate_limits.window_start
      END,
      window_ms = EXCLUDED.window_ms,
      updated_at = NOW()
    RETURNING hits, window_start, window_ms
  `

  const row = rows[0]
  if (!row) {
    throw new Error('Rate limit row was not returned by the database.')
  }

  return {
    ok: row.hits <= options.max,
    remaining: Math.max(0, options.max - row.hits),
    resetAt: row.window_start.getTime() + row.window_ms,
  }
}

export async function rateLimit(
  namespace: string,
  identifier: string,
  options: RateLimitOptions,
  behavior: RateLimitBehavior = {},
): Promise<RateLimitResult> {
  const now = Date.now()
  const identifierHash = await sha256Hex(`${namespace}:${identifier}`)

  try {
    const result = await takeDbRateLimit(namespace, identifierHash, options)
    void maybeCleanupDb(now)
    return result
  } catch (error) {
    const fallback = resolveRateLimitFallbackMode(behavior.fallback)
    const errorMessage = error instanceof Error ? error.message : String(error)

    if (fallback === 'memory') {
      logger.warn('DB-backed rate limiter unavailable, using memory fallback', {
        namespace,
        error: errorMessage,
      })
      return takeMemoryRateLimit(namespace, identifierHash, options)
    }

    logger.error('DB-backed rate limiter unavailable', {
      namespace,
      error: errorMessage,
    })

    throw new ServiceUnavailableError(
      behavior.unavailableMessage ?? DEFAULT_UNAVAILABLE_MESSAGE,
      { namespace, error: errorMessage },
    )
  }
}

export const AUTH_RATE_LIMIT: RateLimitOptions = {
  max: 5,
  windowMs: 15 * 60 * 1000,
}

export const API_RATE_LIMIT: RateLimitOptions = {
  max: 20,
  windowMs: 60 * 1000,
}

export const HEAVY_API_RATE_LIMIT: RateLimitOptions = {
  max: 5,
  windowMs: 60 * 1000,
}

/** Inline score edits from the heatmap — one request per cell, so allow more. */
export const SCORE_EDIT_RATE_LIMIT: RateLimitOptions = {
  max: 60,
  windowMs: 60 * 1000,
}
