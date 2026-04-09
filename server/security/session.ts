import 'server-only'
import { signJwt, verifyJwt } from '@/lib/jwt'
import type { AuthUser, UserRole } from '@/types/domain'

export const SESSION_COOKIE  = '_session'
export const SESSION_MAX_AGE = 60 * 60 * 24  // 24 hours in seconds

/**
 * Creates a signed JWT for the given user.
 * The token embeds token_version so the server can invalidate old tokens.
 */
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

/**
 * Verifies a JWT token string.
 * Returns the AuthUser payload if valid, null otherwise.
 *
 * NOTE: This only checks signature + expiry. Token version (DB invalidation)
 * is checked in getSessionUser() which has DB access.
 */
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
      id:           payload.sub,
      role:         payload.rol as UserRole,
      name:         payload.nam,
      email:        payload.eml,
      tokenVersion: payload.ver,
    },
    shouldRefresh,
  }
}
