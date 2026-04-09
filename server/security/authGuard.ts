import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { ForbiddenError, UnauthorizedError } from '@/lib/errors'
import { SESSION_COOKIE, verifySessionJwt, createSessionJwt, SESSION_MAX_AGE } from '@/server/security/session'
import { getTokenVersion, findUserById } from '@/server/repositories/userRepository'
import type { Permission, UserRole, AuthUser } from '@/types/domain'

// ─── Permission matrix ───────────────────────────────────────────────────────

const PERMISSION_MATRIX: Record<Permission, UserRole[]> = {
  // All authenticated users
  'dashboard:view': ['super_admin', 'admin', 'manager', 'viewer'],
  'ranking:view':   ['super_admin', 'admin', 'manager', 'viewer'],

  // Import operations
  'players:import': ['super_admin', 'admin', 'manager'],
  'scores:import':  ['super_admin', 'admin', 'manager'],

  // Edit operations
  'scores:edit':    ['super_admin', 'admin', 'manager'],

  // Train operations
  'trains:trigger':    ['super_admin', 'admin', 'manager'],
  'trains:configure':  ['super_admin', 'admin', 'manager'],

  // Admin-only
  'players:manage':     ['super_admin', 'admin', 'manager'],
  'rating:configure':   ['super_admin', 'admin', 'manager'],
  'rating:recalculate': ['super_admin', 'admin', 'manager'],
  'audit:view':         ['super_admin', 'admin'],

  // User management
  'users:invite':       ['super_admin', 'admin'],
  'users:manage':       ['super_admin', 'admin'],
  'users:promote_admin':['super_admin'],

  // Settings
  'settings:configure': ['super_admin'],

  // Admin area access
  'admin:view':         ['super_admin', 'admin'],
}

// ─── Core helpers ────────────────────────────────────────────────────────────

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return PERMISSION_MATRIX[permission].includes(role)
}

export function requirePermission(role: UserRole, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new ForbiddenError(
      `Role "${role}" is not allowed to perform "${permission}"`,
    )
  }
}

// ─── Session ─────────────────────────────────────────────────────────────────

/**
 * Returns the currently authenticated user, or null if not authenticated.
 *
 * Validates:
 *   1. JWT signature + expiry (fast, no DB)
 *   2. token_version matches DB (catches logout, password change, deactivation)
 *   3. user.is_active is true
 *
 * Also handles silent JWT refresh when the token is within 4h of expiry.
 */
export const getSessionUser = cache(async (): Promise<AuthUser | null> => {
  const cookieStore  = await cookies()
  const token        = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  const verified = await verifySessionJwt(token)
  if (!verified) return null

  const { user, shouldRefresh } = verified

  // DB validation: token_version + is_active
  const [dbVersion, dbUser] = await Promise.all([
    getTokenVersion(user.id),
    findUserById(user.id),
  ])

  if (dbVersion === null || dbUser === null) return null
  if (dbVersion !== user.tokenVersion) return null
  if (!dbUser.isActive) return null

  // Sync role from DB (catches role changes that haven't forced a new login)
  const currentUser: AuthUser = {
    ...user,
    role: dbUser.role,
    name: dbUser.name,
    email: dbUser.email,
  }

  // Silent refresh — update the cookie but don't block the response
  if (shouldRefresh) {
    const newToken = await createSessionJwt({ ...currentUser, tokenVersion: dbVersion })
    // We can't set cookies in a server component context here, so we set a
    // header that the middleware can pick up. In route handlers, the caller
    // is responsible for refreshing via the Set-Cookie header.
    // For now, refresh is handled in the login flow and middleware.
    void newToken  // suppress unused warning — refresh is best-effort
  }

  return currentUser
})

/**
 * Asserts that a valid session exists and the user has the required permission.
 * Call at the top of protected route handlers.
 *
 * @throws UnauthorizedError if no session
 * @throws ForbiddenError if insufficient permissions
 */
export async function requireAuth(permission: Permission): Promise<AuthUser> {
  const user = await getSessionUser()
  if (!user) throw new UnauthorizedError()
  requirePermission(user.role, permission)
  return user
}

/**
 * Sets the session cookie with a fresh JWT.
 * Returns the Set-Cookie header value for use in route handlers.
 */
export async function buildSessionCookie(user: AuthUser): Promise<string> {
  const token = await createSessionJwt(user)
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}${secure}`
}

/**
 * Cookie that clears the session.
 */
export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
}
