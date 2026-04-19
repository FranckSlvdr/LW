import { z } from 'zod'
import { created, fail } from '@/lib/apiResponse'
import { logger } from '@/lib/logger'
import {
  HEAVY_API_RATE_LIMIT,
  buildRateLimitIdentifier,
  rateLimit,
  rateLimitResponse,
} from '@/lib/rateLimit'
import { requireAuth } from '@/server/security/authGuard'
import { triggerFullWeekSelection } from '@/server/services/trainService'

export const maxDuration = 60

const schema = z.object({
  weekId: z.number().int().positive(),
})

export async function POST(request: Request) {
  const startedAt = Date.now()
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
    logger.info('Train API full-week selection completed', {
      actorId: actor.id,
      weekId,
      runs: runs.length,
      ms: Date.now() - startedAt,
    })
    return created(runs)
  } catch (err) {
    logger.error('Train API week POST failed', {
      message: err instanceof Error ? err.message : String(err),
      ms: Date.now() - startedAt,
    })
    return fail(err)
  }
}
