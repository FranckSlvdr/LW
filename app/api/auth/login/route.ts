import { NextResponse } from 'next/server'
import { z } from 'zod'
import { buildSessionCookie } from '@/server/security/authGuard'
import { validateCredentials } from '@/server/services/userService'
import { insertAuditLog } from '@/server/repositories/auditRepository'
import { rateLimit, AUTH_RATE_LIMIT } from '@/lib/rateLimit'
import { ok, fail } from '@/lib/apiResponse'
import { UnauthorizedError } from '@/lib/errors'

const loginSchema = z.object({
  email:    z.string().email().max(256),
  password: z.string().min(1).max(256),
})

export async function POST(request: Request) {
  const ip = (request.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim()

  try {
    const limit = await rateLimit('login', ip, AUTH_RATE_LIMIT)
    if (!limit.ok) {
      return NextResponse.json(
        { success: false, error: { code: 'RATE_LIMITED', message: 'Trop de tentatives. Réessayez dans quelques minutes.' } },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((limit.resetAt - Date.now()) / 1000)) } },
      )
    }

    const body                = await request.json()
    const { email, password } = loginSchema.parse(body)

    const user = await validateCredentials(email, password)

    if (!user) {
      // Log failed attempt (no user_id — we may not know who it is)
      await insertAuditLog({
        entityType:  'user',
        action:      'LOGIN_FAILED',
        afterJson:   { email },
        performedBy: email,
        ipAddress:   ip,
      }).catch(() => {/* non-blocking */})

      throw new UnauthorizedError('Email ou mot de passe incorrect.')
    }

    await insertAuditLog({
      entityType:  'user',
      action:      'LOGIN',
      afterJson:   { email: user.email },
      performedBy: user.email,
      userId:      user.id,
      userEmail:   user.email,
      ipAddress:   ip,
    }).catch(() => {/* non-blocking */})

    const cookieHeader = await buildSessionCookie(user)
    const isSecure     = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'

    const response = ok({ name: user.name, role: user.role })
    response.headers.set('Set-Cookie', cookieHeader + (isSecure ? '; Secure' : ''))
    return response
  } catch (err) {
    return fail(err)
  }
}
