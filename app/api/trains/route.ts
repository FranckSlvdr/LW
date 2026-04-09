import { ok, created, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/server/security/authGuard'
import { getTrainRunsForWeek, triggerTrainSelection, getRecentTrainHistory } from '@/server/services/trainService'
import { ValidationError } from '@/lib/errors'
import { z } from 'zod'

const triggerSchema = z.object({
  weekId:   z.number().int().positive(),
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
    await requireAuth('trains:trigger')
    const body   = await request.json()
    const input  = triggerSchema.parse(body)
    const result = await triggerTrainSelection(input)
    return created(result)
  } catch (err) {
    return fail(err)
  }
}
