import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/server/security/authGuard'
import { getTrainSettings, patchTrainSettings } from '@/server/services/trainService'
import { z } from 'zod'

const patchSchema = z.object({
  exclusionWindowWeeks:   z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).optional(),
  includeDsTop2:          z.boolean().optional(),
  includeBestContributor: z.boolean().optional(),
  totalDriversPerDay:     z.number().int().min(1).max(10).optional(),
  vsTopCount:             z.number().int().min(0).max(50).optional(),
  vsTopDays:              z.array(z.number().int().min(1).max(6)).optional(),
})

export async function GET() {
  try {
    await requireAuth('dashboard:view')
    const settings = await getTrainSettings()
    return ok(settings)
  } catch (err) {
    return fail(err)
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAuth('trains:configure')
    const body     = await request.json()
    const input    = patchSchema.parse(body)
    const settings = await patchTrainSettings(input)
    return ok(settings)
  } catch (err) {
    return fail(err)
  }
}
