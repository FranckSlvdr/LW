import { z } from 'zod'
import { created, fail } from '@/lib/apiResponse'
import {
  HEAVY_API_RATE_LIMIT,
  buildRateLimitIdentifier,
  rateLimit,
  rateLimitResponse,
} from '@/lib/rateLimit'
import { requireAuth } from '@/server/security/authGuard'
import { triggerFullWeekSelection } from '@/server/services/trainService'

const schema = z.object({
  weekId: z.number().int().positive(),
})

export async function POST(request: Request) {
  try {
    const actor = await requireAuth('trains:trigger')
    const limit = await rateLimit(
      'trains:trigger-week',
      buildRateLimitIdentifier(request, actor.id),
      HEAVY_API_RATE_LIMIT,
    )
    if (!limit.ok) {
      return rateLimitResponse(limit, 'Trop de tirages de semaine en peu de temps.')
    }

    const body = await request.json()
    const { weekId } = schema.parse(body)
    const runs = await triggerFullWeekSelection(weekId)
    return created(runs)
  } catch (err) {
    return fail(err)
  }
}
