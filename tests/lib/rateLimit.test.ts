import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildRateLimitIdentifier,
  getClientIp,
  rateLimitResponse,
  resolveRateLimitFallbackMode,
} from '@/lib/rateLimitShared'

test('getClientIp prefers the first forwarded IP', () => {
  const request = new Request('https://example.test', {
    headers: {
      'x-forwarded-for': '203.0.113.10, 198.51.100.4',
      'x-real-ip': '198.51.100.9',
    },
  })

  assert.equal(getClientIp(request), '203.0.113.10')
  assert.equal(
    buildRateLimitIdentifier(request, 'user-42'),
    'user-42:203.0.113.10',
  )
})

test('getClientIp falls back to x-real-ip and then unknown', () => {
  const realIpRequest = new Request('https://example.test', {
    headers: { 'x-real-ip': '198.51.100.9' },
  })
  const unknownRequest = new Request('https://example.test')

  assert.equal(getClientIp(realIpRequest), '198.51.100.9')
  assert.equal(getClientIp(unknownRequest), 'unknown')
})

test('resolveRateLimitFallbackMode is strict in production', () => {
  const previousNodeEnv = process.env.NODE_ENV
  const previousVercel = process.env.VERCEL

  try {
    Reflect.set(process.env, 'NODE_ENV', 'production')
    Reflect.deleteProperty(process.env, 'VERCEL')
    assert.equal(resolveRateLimitFallbackMode(), 'error')

    Reflect.set(process.env, 'NODE_ENV', 'development')
    Reflect.deleteProperty(process.env, 'VERCEL')
    assert.equal(resolveRateLimitFallbackMode(), 'memory')

    Reflect.set(process.env, 'NODE_ENV', 'production')
    assert.equal(resolveRateLimitFallbackMode('memory'), 'memory')

    Reflect.set(process.env, 'NODE_ENV', 'development')
    Reflect.set(process.env, 'VERCEL', '1')
    assert.equal(resolveRateLimitFallbackMode(), 'error')
  } finally {
    if (previousNodeEnv === undefined) {
      Reflect.deleteProperty(process.env, 'NODE_ENV')
    } else {
      Reflect.set(process.env, 'NODE_ENV', previousNodeEnv)
    }

    if (previousVercel === undefined) {
      Reflect.deleteProperty(process.env, 'VERCEL')
    } else {
      Reflect.set(process.env, 'VERCEL', previousVercel)
    }
  }
})

test('rateLimitResponse returns the standard 429 envelope', async () => {
  const response = rateLimitResponse(
    {
      ok: false,
      remaining: 0,
      resetAt: Date.now() + 5_000,
    },
    'Slow down.',
  )

  const body = await response.json()

  assert.equal(response.status, 429)
  assert.equal(response.headers.get('X-RateLimit-Remaining'), '0')
  assert.equal(body.success, false)
  assert.equal(body.error.code, 'RATE_LIMITED')
  assert.equal(body.error.message, 'Slow down.')
})
