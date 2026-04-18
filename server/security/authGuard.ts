import 'server-only'

import { cache } from 'react'
import { cookies } from 'next/headers'
import { UnauthorizedError } from '@/lib/errors'
import { findUserWithTokenVersion } from '@/server/repositories/userRepository'
import { requirePermission } from '@/server/security/permissions'
import {
  createSessionJwt,
  verifySessionJwt,
} from '@/server/security/session'
import { buildClearedSessionCookie, buildSessionCookieHeader } from '@/server/security/sessionCookie'
import { SESSION_COOKIE } from '@/server/security/sessionConfig'
import type { AuthUser, Permission } from '@/types/domain'

export { hasPermission, requirePermission } from '@/server/security/permissions'

export const getSessionUser = cache(async (): Promise<AuthUser | null> => {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  const verified = await verifySessionJwt(token)
  if (!verified) return null

  const { user } = verified

  const result = await findUserWithTokenVersion(user.id)
  if (!result) return null
  if (result.tokenVersion !== user.tokenVersion) return null
  if (!result.user.isActive) return null

  const currentUser: AuthUser = {
    ...user,
    role: result.user.role,
    name: result.user.name,
    email: result.user.email,
  }

  return currentUser
})

export async function requireAuth(permission: Permission): Promise<AuthUser> {
  const user = await getSessionUser()
  if (!user) throw new UnauthorizedError()
  requirePermission(user.role, permission)
  return user
}

export async function buildSessionCookie(user: AuthUser): Promise<string> {
  const token = await createSessionJwt(user)
  return buildSessionCookieHeader(token)
}

export function clearSessionCookie(): string {
  return buildClearedSessionCookie()
}
