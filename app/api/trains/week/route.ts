import { created, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/server/security/authGuard'
import { triggerFullWeekSelection } from '@/server/services/trainService'
import { z } from 'zod'

const schema = z.object({
  weekId: z.number().int().positive(),
})

export async function POST(request: Request) {
  try {
    await requireAuth('trains:trigger')
    const body  = await request.json()
    const { weekId } = schema.parse(body)
    const runs  = await triggerFullWeekSelection(weekId)
    return created(runs)
  } catch (err) {
    return fail(err)
  }
}
