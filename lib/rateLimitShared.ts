export interface RateLimitResult {
  ok: boolean
  remaining: number
  resetAt: number
}

export type RateLimitFallbackMode = 'memory' | 'error'

export function resolveRateLimitFallbackMode(
  fallback?: RateLimitFallbackMode,
): RateLimitFallbackMode {
  if (fallback) return fallback
  return process.env.NODE_ENV === 'production' || process.env.VERCEL
    ? 'error'
    : 'memory'
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfIp = request.headers.get('cf-connecting-ip')

  return (
    forwarded?.split(',')[0]?.trim() ||
    realIp?.trim() ||
    cfIp?.trim() ||
    'unknown'
  )
}

export function buildRateLimitIdentifier(
  request: Request,
  subject?: string | number,
): string {
  const ip = getClientIp(request)
  return subject !== undefined ? `${subject}:${ip}` : ip
}

export function rateLimitResponse(
  result: RateLimitResult,
  message: string = 'Too many requests. Please try again later.',
): Response {
  const retryAfter = Math.max(
    1,
    Math.ceil((result.resetAt - Date.now()) / 1000),
  )

  return Response.json(
    {
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message,
      },
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(result.resetAt),
      },
    },
  )
}
