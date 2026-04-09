import 'server-only'

/**
 * Standardized API response helpers for Route Handlers.
 *
 * All API routes should use ok() and fail() exclusively — never construct
 * Response.json() manually. This ensures consistent envelope shape across
 * the entire API surface.
 *
 * Envelope:
 *   Success → { success: true,  data: T }
 *   Error   → { success: false, error: { code, message, details? } }
 */

import { isAppError, toErrorMessage } from './errors'
import { logger } from './logger'
import type { ApiSuccess, ApiError } from '@/types/api'

// ─── Success responses ───────────────────────────────────────────────────────

export function ok<T>(data: T, status: number = 200): Response {
  const body: ApiSuccess<T> = { success: true, data }
  return Response.json(body, { status })
}

export function created<T>(data: T): Response {
  return ok(data, 201)
}

export function noContent(): Response {
  return new Response(null, { status: 204 })
}

// ─── Error responses ─────────────────────────────────────────────────────────

export function fail(error: unknown): Response {
  if (isAppError(error)) {
    const body: ApiError = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        // Expose internal details only in development
        ...(process.env.NODE_ENV !== 'production' && error.details !== undefined
          ? { details: error.details }
          : {}),
      },
    }
    return Response.json(body, { status: error.statusCode })
  }

  // Unknown / unexpected error — log server-side, hide details from client
  logger.error('Unhandled error in route handler', {
    message: toErrorMessage(error),
    stack: error instanceof Error ? error.stack : undefined,
  })

  const body: ApiError = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred. Please try again later.',
    },
  }
  return Response.json(body, { status: 500 })
}

// ─── Type guard for API consumers ────────────────────────────────────────────

export function isApiSuccess<T>(
  response: ApiSuccess<T> | ApiError,
): response is ApiSuccess<T> {
  return response.success === true
}
