import { z } from 'zod'
import { buildSessionCookie } from '@/server/security/authGuard'
import { insertAuditLog } from '@/server/repositories/auditRepository'
import { ok, fail } from '@/lib/apiResponse'
import { UnauthorizedError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import {
  AUTH_RATE_LIMIT,
  buildRateLimitIdentifier,
  getClientIp,
  rateLimit,
  rateLimitResponse,
} from '@/lib/rateLimit'
import { validateCredentials } from '@/server/services/userService'

const loginSchema = z.object({
  email: z.string().email().max(256),
  password: z.string().min(1).max(256),
})

export async function POST(request: Request) {
  const ip = getClientIp(request)

  try {
    const limit = await rateLimit(
      'auth:login',
      buildRateLimitIdentifier(request),
      AUTH_RATE_LIMIT,
    )
    if (!limit.ok) {
      return rateLimitResponse(
        limit,
        'Trop de tentatives. Reessayez dans quelques minutes.',
      )
    }

    const body = await request.json()
    const { email, password } = loginSchema.parse(body)
    const user = await validateCredentials(email, password)

    if (!user) {
      logger.warn('Login failed', { email, ipAddress: ip })
      await insertAuditLog({
        entityType: 'user',
        action: 'LOGIN_FAILED',
        afterJson: { email },
        performedBy: email,
        ipAddress: ip,
      }).catch(() => {})

      throw new UnauthorizedError('Email ou mot de passe incorrect.')
    }

    await insertAuditLog({
      entityType: 'user',
      action: 'LOGIN',
      afterJson: { email: user.email },
      performedBy: user.email,
      userId: user.id,
      userEmail: user.email,
      ipAddress: ip,
    }).catch(() => {})

    logger.info('Login succeeded', {
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      ipAddress: ip,
    })

    const cookieHeader = await buildSessionCookie(user)
    const response = ok({ name: user.name, role: user.role })
    response.headers.set('Set-Cookie', cookieHeader)
    return response
  } catch (err) {
    return fail(err)
  }
}
