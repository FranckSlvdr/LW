import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/server/security/authGuard'
import { triggerRatingRun, getActiveRatingForWeek } from '@/server/services/ratingService'
import { triggerRatingRunSchema } from '@/server/validators/ratingValidator'
import { ValidationError } from '@/lib/errors'

/** GET /api/rating?weekId=X — fetch the active rating run for a week */
export async function GET(request: Request) {
  try {
    await requireAuth('dashboard:view')
    const { searchParams } = new URL(request.url)
    const weekIdParam = searchParams.get('weekId')
    if (!weekIdParam || isNaN(Number(weekIdParam))) {
      throw new ValidationError('weekId (number) est requis')
    }
    const ratings = await getActiveRatingForWeek(Number(weekIdParam))
    return ok(ratings ?? [])
  } catch (err) {
    return fail(err)
  }
}

/** POST /api/rating — trigger a new rating calculation */
export async function POST(request: Request) {
  try {
    await requireAuth('rating:recalculate')
    const body = await request.json()
    const parsed = triggerRatingRunSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError('Données invalides', parsed.error.flatten())
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
