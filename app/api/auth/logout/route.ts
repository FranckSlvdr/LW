import { ok, fail } from '@/lib/apiResponse'
import { clearSessionCookie, getSessionUser } from '@/server/security/authGuard'
import { invalidateUserSessions } from '@/server/services/userService'
import { insertAuditLog } from '@/server/repositories/auditRepository'

export async function POST(request: Request) {
  const ip = (request.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim()
  try {
    const user = await getSessionUser()
    if (user) {
      await invalidateUserSessions(user.id)
      await insertAuditLog({
        entityType:  'user',
        action:      'LOGOUT',
        afterJson:   { email: user.email },
        performedBy: user.email,
        userId:      user.id,
        userEmail:   user.email,
        ipAddress:   ip,
      }).catch(() => {/* non-blocking */})
    }

    const response = ok({ loggedOut: true })
    response.headers.set('Set-Cookie', clearSessionCookie())
    return response
  } catch (err) {
    return fail(err)
  }
}
