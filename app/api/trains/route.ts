import { z } from 'zod'
import { ok, created, fail } from '@/lib/apiResponse'
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

const triggerSchema = z.object({
  weekId: z.number().int().positive(),
  trainDay: z.number().int().min(1).max(7),
})

export async function GET(request: Request) {
  try {
    await requireAuth('dashboard:view')
    const { searchParams } = new URL(request.url)
    const weekId = searchParams.get('weekId')

    if (weekId) {
      const runs = await getTrainRunsForWeek(Number(weekId))
      return ok(runs)
    }

    const history = await getRecentTrainHistory(30)
    return ok(history)
  } catch (err) {
    return fail(err)
  }
}

export async function POST(request: Request) {
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
    return created(result)
  } catch (err) {
    return fail(err)
  }
}
