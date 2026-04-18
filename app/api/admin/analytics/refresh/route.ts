import { z } from 'zod'
import { ok, fail } from '@/lib/apiResponse'
import { BadRequestError } from '@/lib/errors'
import {
  HEAVY_API_RATE_LIMIT,
  buildRateLimitIdentifier,
  rateLimit,
  rateLimitResponse,
} from '@/lib/rateLimit'
import { requireAuth } from '@/server/security/authGuard'
import { refreshWeekAnalytics } from '@/server/services/analyticsService'

const schema = z.object({
  weekId: z.coerce.number().int().positive(),
})

// Force-refreshing a week recomputes and persists multiple analytics tables.
export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const actor = await requireAuth('scores:import')
    const limit = await rateLimit(
      'analytics:refresh',
      buildRateLimitIdentifier(request, actor.id),
      HEAVY_API_RATE_LIMIT,
    )
    if (!limit.ok) {
      return rateLimitResponse(limit, 'Trop de recalculs analytics en peu de temps.')
    }

    const body = await request.json()
    const { weekId } = schema.parse(body)
    if (!weekId) throw new BadRequestError('weekId requis')

    await refreshWeekAnalytics(weekId)
    return ok({ weekId, refreshed: true })
  } catch (err) {
    return fail(err)
  }
}
