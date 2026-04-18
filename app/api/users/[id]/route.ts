import { z } from 'zod'
import { ok, fail } from '@/lib/apiResponse'
import {
  API_RATE_LIMIT,
  buildRateLimitIdentifier,
  getClientIp,
  rateLimit,
  rateLimitResponse,
} from '@/lib/rateLimit'
import { requireAuth } from '@/server/security/authGuard'
import {
  activateUser,
  changeUserRole,
  deactivateUser,
} from '@/server/services/userService'
import type { UserRole } from '@/types/domain'

const patchSchema = z
  .object({
    isActive: z.boolean().optional(),
    role: z.enum(['super_admin', 'admin', 'manager', 'viewer']).optional(),
  })
  .refine((data) => data.isActive !== undefined || data.role !== undefined, {
    message: 'At least one of isActive or role is required',
  })

export async function PATCH(
  request: Request,
  context: RouteContext<'/api/users/[id]'>,
) {
  try {
    const actor = await requireAuth('users:manage')
    const limit = await rateLimit(
      'users:update',
      buildRateLimitIdentifier(request, actor.id),
      API_RATE_LIMIT,
    )
    if (!limit.ok) {
      return rateLimitResponse(limit)
    }

    const { id } = await context.params
    const body = patchSchema.parse(await request.json())
    const opts = { ipAddress: getClientIp(request) }

    let result
    if (body.isActive === false) {
      result = await deactivateUser(id, actor, opts)
    } else if (body.isActive === true) {
      result = await activateUser(id, actor, opts)
    } else if (body.role !== undefined) {
      result = await changeUserRole(id, body.role as UserRole, actor, opts)
    }

    return ok(result)
  } catch (err) {
    return fail(err)
  }
}
