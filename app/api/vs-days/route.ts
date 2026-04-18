import { ok, created, fail } from '@/lib/apiResponse'
import { ValidationError } from '@/lib/errors'
import {
  API_RATE_LIMIT,
  buildRateLimitIdentifier,
  rateLimit,
  rateLimitResponse,
} from '@/lib/rateLimit'
import { requireAuth } from '@/server/security/authGuard'
import { getVsDaysForWeek, setVsDayEco } from '@/server/services/vsDayService'
import { upsertVsDaySchema } from '@/server/validators/vsDayValidator'

export async function GET(request: Request) {
  try {
    await requireAuth('dashboard:view')
    const { searchParams } = new URL(request.url)
    const weekIdParam = searchParams.get('weekId')
    if (!weekIdParam || Number.isNaN(Number(weekIdParam))) {
      throw new ValidationError('weekId (number) est requis')
    }

    const days = await getVsDaysForWeek(Number(weekIdParam))
    return ok(days)
  } catch (err) {
    return fail(err)
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requireAuth('scores:edit')
    const limit = await rateLimit(
      'vs-days:patch',
      buildRateLimitIdentifier(request, actor.id),
      API_RATE_LIMIT,
    )
    if (!limit.ok) {
      return rateLimitResponse(limit)
    }

    const input = upsertVsDaySchema.parse(await request.json())
    const day = await setVsDayEco(input)
    return created(day)
  } catch (err) {
    return fail(err)
  }
}
