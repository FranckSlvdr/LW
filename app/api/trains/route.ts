import { z } from 'zod'
import { ok, created, fail } from '@/lib/apiResponse'
import { logger } from '@/lib/logger'
import {
  HEAVY_API_RATE_LIMIT,
  buildRateLimitIdentifier,
  rateLimit,
  rateLimitResponse,
} from '@/lib/rateLimit'
import { requireAuth } from '@/server/security/authGuard'
import {
  getRecentTrainHistory,
  getTrainRunsForWeek,
  triggerTrainSelection,
} from '@/server/services/trainService'

export const maxDuration = 60

const triggerSchema = z.object({
  weekId: z.number().int().positive(),
  trainDay: z.number().int().min(1).max(7),
})

export async function GET(request: Request) {
  const startedAt = Date.now()
  try {
    await requireAuth('dashboard:view')
    const { searchParams } = new URL(request.url)
    const weekId = searchParams.get('weekId')
    const limitParam = searchParams.get('limit')

    if (weekId) {
      const runs = await getTrainRunsForWeek(Number(weekId))
      logger.info('Train API week runs loaded', {
        weekId: Number(weekId),
        runs: runs.length,
        ms: Date.now() - startedAt,
      })
      return ok(runs)
    }

    const parsedLimit = limitParam ? Number(limitParam) : 30
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(Math.trunc(parsedLimit), 1), 100)
      : 30

    const history = await getRecentTrainHistory(limit)
    logger.info('Train API history loaded', {
      limit,
      runs: history.length,
      ms: Date.now() - startedAt,
    })
    return ok(history)
  } catch (err) {
    logger.error('Train API GET failed', {
      message: err instanceof Error ? err.message : String(err),
      ms: Date.now() - startedAt,
    })
    return fail(err)
  }
}

export async function POST(request: Request) {
  const startedAt = Date.now()
  try {
    const actor = await requireAuth('trains:trigger')
    const limit = await rateLimit(
      'trains:trigger',
      buildRateLimitIdentifier(request, actor.id),
      HEAVY_API_RATE_LIMIT,
    )
    if (!limit.ok) {
      return rateLimitResponse(limit, 'Trop de tirages de train en peu de temps.')
    }

    const body = await request.json()
    const input = triggerSchema.parse(body)
    const result = await triggerTrainSelection(input)
    logger.info('Train API day selection completed', {
      actorId: actor.id,
      weekId: input.weekId,
      trainDay: input.trainDay,
      selections: result.selections.length,
      ms: Date.now() - startedAt,
    })
    return created(result)
  } catch (err) {
    logger.error('Train API POST failed', {
      message: err instanceof Error ? err.message : String(err),
      ms: Date.now() - startedAt,
    })
    return fail(err)
  }
}
