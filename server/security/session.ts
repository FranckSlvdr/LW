import 'server-only'

import { signJwt, verifyJwt } from '@/lib/jwt'
import type { AuthUser, UserRole } from '@/types/domain'

export { SESSION_COOKIE, SESSION_MAX_AGE } from '@/server/security/sessionConfig'

export async function createSessionJwt(user: AuthUser): Promise<string> {
  const secret = process.env.APP_SECRET
  if (!secret) throw new Error('APP_SECRET is not set')

  return signJwt(
    {
      sub: user.id,
      rol: user.role,
      nam: user.name,
      eml: user.email,
      ver: user.tokenVersion,
    },
    secret,
  )
}

export async function verifySessionJwt(
  token: string,
): Promise<{ user: AuthUser; shouldRefresh: boolean } | null> {
  const secret = process.env.APP_SECRET
  if (!secret) return null

  const result = await verifyJwt(token, secret)
  if (!result.ok) return null

  const { payload, shouldRefresh } = result
  return {
    user: {
      id: payload.sub,
      role: payload.rol as UserRole,
      name: payload.nam,
      email: payload.eml,
      tokenVersion: payload.ver,
    },
    shouldRefresh,
  }
}
