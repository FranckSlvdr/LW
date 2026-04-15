import { ok, created, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/server/security/authGuard'
import { getVsDaysForWeek, setVsDayEco } from '@/server/services/vsDayService'
import { upsertVsDaySchema } from '@/server/validators/vsDayValidator'
import { ValidationError } from '@/lib/errors'

/** GET /api/vs-days?weekId=X — fetch all eco day flags for a week */
export async function GET(request: Request) {
  try {
    await requireAuth('dashboard:view')
    const { searchParams } = new URL(request.url)
    const weekIdParam = searchParams.get('weekId')
    if (!weekIdParam || isNaN(Number(weekIdParam))) {
      throw new ValidationError('weekId (number) est requis')
    }
    const days = await getVsDaysForWeek(Number(weekIdParam))
    return ok(days)
  } catch (err) {
    return fail(err)
  }
}

/** PATCH /api/vs-days — toggle eco status for a week/day */
export async function PATCH(request: Request) {
  try {
    await requireAuth('scores:edit')
    const input = upsertVsDaySchema.parse(await request.json())
    const day = await setVsDayEco(input)
    return created(day)
  } catch (err) {
    return fail(err)
  }
}
