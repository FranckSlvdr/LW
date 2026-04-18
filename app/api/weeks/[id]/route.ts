import { z } from 'zod'
import { ok, fail } from '@/lib/apiResponse'
import { BadRequestError } from '@/lib/errors'
import {
  API_RATE_LIMIT,
  buildRateLimitIdentifier,
  rateLimit,
  rateLimitResponse,
} from '@/lib/rateLimit'
import { requireAuth } from '@/server/security/authGuard'
import { lockExistingWeek } from '@/server/services/weekService'

const patchSchema = z.object({
  isLocked: z.boolean(),
})

export async function PATCH(
  request: Request,
  context: RouteContext<'/api/weeks/[id]'>,
) {
  try {
    const actor = await requireAuth('weeks:manage')
    const limit = await rateLimit(
      'weeks:lock',
      buildRateLimitIdentifier(request, actor.id),
      API_RATE_LIMIT,
    )
    if (!limit.ok) {
      return rateLimitResponse(limit)
    }

    const { id } = await context.params
    const weekId = Number(id)
    if (!Number.isInteger(weekId) || weekId <= 0) {
      throw new BadRequestError('weekId invalide')
    }

    const body = await request.json()
    const { isLocked } = patchSchema.parse(body)
    const week = await lockExistingWeek(weekId, isLocked)
    return ok(week)
  } catch (err) {
    return fail(err)
  }
}
