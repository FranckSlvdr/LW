import { ok, created, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/server/security/authGuard'
import { getAllWeeks, createNewWeek } from '@/server/services/weekService'

export async function GET() {
  try {
    await requireAuth('dashboard:view')
    const weeks = await getAllWeeks()
    return ok(weeks)
  } catch (err) {
    return fail(err)
  }
}

export async function POST(request: Request) {
  try {
    await requireAuth('scores:import')
    const body = await request.json()
    const week = await createNewWeek(body)
    return created(week)
  } catch (err) {
    return fail(err)
  }
}
