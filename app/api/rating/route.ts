import { ok, fail } from '@/lib/apiResponse'
import { ValidationError } from '@/lib/errors'
import {
  HEAVY_API_RATE_LIMIT,
  buildRateLimitIdentifier,
  rateLimit,
  rateLimitResponse,
} from '@/lib/rateLimit'
import { requireAuth } from '@/server/security/authGuard'
import {
  getActiveRatingForWeek,
  triggerRatingRun,
} from '@/server/services/ratingService'
import { triggerRatingRunSchema } from '@/server/validators/ratingValidator'

export async function GET(request: Request) {
  try {
    await requireAuth('dashboard:view')
    const { searchParams } = new URL(request.url)
    const weekIdParam = searchParams.get('weekId')
    if (!weekIdParam || Number.isNaN(Number(weekIdParam))) {
      throw new ValidationError('weekId (number) est requis')
    }

    const ratings = await getActiveRatingForWeek(Number(weekIdParam))
    return ok(ratings ?? [])
  } catch (err) {
    return fail(err)
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAuth('rating:recalculate')
    const limit = await rateLimit(
      'rating:recalculate',
      buildRateLimitIdentifier(request, actor.id),
      HEAVY_API_RATE_LIMIT,
    )
    if (!limit.ok) {
      return rateLimitResponse(limit, 'Trop de recalculs de classement en peu de temps.')
    }

    const body = await request.json()
    const parsed = triggerRatingRunSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError('Donnees invalides', parsed.error.flatten())
    }

    const result = await triggerRatingRun(
      parsed.data.weekId,
      'api',
      parsed.data.label,
    )
    return ok(result)
  } catch (err) {
    return fail(err)
  }
}
