import { ok, fail } from '@/lib/apiResponse'
import {
  API_RATE_LIMIT,
  buildRateLimitIdentifier,
  getClientIp,
  rateLimit,
  rateLimitResponse,
} from '@/lib/rateLimit'
import { requireAuth } from '@/server/security/authGuard'
import { adminForcePasswordReset } from '@/server/services/userService'

export async function POST(
  request: Request,
  context: RouteContext<'/api/users/[id]/force-reset'>,
) {
  try {
    const actor = await requireAuth('users:manage')
    const limit = await rateLimit(
      'users:force-reset',
      buildRateLimitIdentifier(request, actor.id),
      API_RATE_LIMIT,
    )
    if (!limit.ok) {
      return rateLimitResponse(limit)
    }

    const { id } = await context.params
    const result = await adminForcePasswordReset(id, actor, {
      ipAddress: getClientIp(request),
    })
    return ok(result)
  } catch (err) {
    return fail(err)
  }
}
