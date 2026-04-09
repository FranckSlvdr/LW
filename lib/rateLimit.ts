/**
 * Pluggable rate limiter.
 *
 * Default: in-memory sliding window, suitable for single-instance dev/staging.
 * Production (multi-instance): swap `store` for an Upstash/Vercel KV adapter.
 *
 * Usage:
 *   const result = await rateLimit('login', ip, { max: 5, windowMs: 60_000 })
 *   if (!result.ok) return NextResponse.json(..., { status: 429 })
 */

export interface RateLimitResult {
  ok: boolean
  remaining: number
  resetAt: number  // Unix timestamp (ms) when the window resets
}

export interface RateLimitOptions {
  /** Maximum allowed requests within the window */
  max: number
  /** Window duration in milliseconds */
  windowMs: number
}

// ─── In-memory store ──────────────────────────────────────────────────────────

interface Entry {
  count: number
  resetAt: number
}

const store = new Map<string, Entry>()

// Prune expired entries every 5 minutes to prevent memory leak
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      if (entry.resetAt < now) store.delete(key)
    }
  }, 5 * 60 * 1000)
}

// ─── Core function ────────────────────────────────────────────────────────────

export async function rateLimit(
  namespace: string,
  identifier: string,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const key = `${namespace}:${identifier}`
  const now = Date.now()

  let entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + options.windowMs }
    store.set(key, entry)
  }

  entry.count++

  const remaining = Math.max(0, options.max - entry.count)
  const ok = entry.count <= options.max

  return { ok, remaining, resetAt: entry.resetAt }
}

// ─── Preset configs ───────────────────────────────────────────────────────────

/** Strict: 5 attempts per 15 minutes — for login, forgot-password */
export const AUTH_RATE_LIMIT: RateLimitOptions = { max: 5, windowMs: 15 * 60 * 1000 }

/** Relaxed: 20 per minute — for authenticated write endpoints */
export const API_RATE_LIMIT: RateLimitOptions = { max: 20, windowMs: 60 * 1000 }
