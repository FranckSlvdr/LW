import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/server/security/authGuard'
import { lockExistingWeek } from '@/server/services/weekService'
import { BadRequestError } from '@/lib/errors'
import { z } from 'zod'

const patchSchema = z.object({
  isLocked: z.boolean(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth('weeks:manage')
    const { id } = await params
    const weekId = Number(id)
    if (!Number.isInteger(weekId) || weekId <= 0) {
      throw new BadRequestError('weekId invalide')
    }
    const body = await request.json()
    const { isLocked } = patchSchema.parse(body)
    const week = await lockExistingWeek(weekId, isLocked)
    return ok(week)
  } catch (err) {
    return fail(err)
  }
}
