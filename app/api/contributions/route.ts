import { ok, created, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/server/security/authGuard'
import { getContributionsForWeek, upsertPlayerContribution, removeContribution } from '@/server/services/contributionService'
import { ValidationError } from '@/lib/errors'
import { z } from 'zod'

const upsertSchema = z.object({
  playerId: z.number().int().positive(),
  weekId:   z.number().int().positive(),
  amount:   z.number().int().min(0),
  note:     z.string().max(200).optional(),
})

const deleteSchema = z.object({
  playerId: z.number().int().positive(),
  weekId:   z.number().int().positive(),
})

export async function GET(request: Request) {
  try {
    await requireAuth('dashboard:view')
    const { searchParams } = new URL(request.url)
    const weekId = Number(searchParams.get('weekId'))
    if (!weekId) throw new ValidationError('weekId is required')
    const data = await getContributionsForWeek(weekId)
    return ok(data)
  } catch (err) {
    return fail(err)
  }
}

export async function POST(request: Request) {
  try {
    await requireAuth('scores:edit')
    const body   = await request.json()
    const input  = upsertSchema.parse(body)
    const result = await upsertPlayerContribution(input)
    return created(result)
  } catch (err) {
    return fail(err)
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAuth('scores:edit')
    const body  = await request.json()
    const input = deleteSchema.parse(body)
    await removeContribution(input.playerId, input.weekId)
    return ok({ deleted: true })
  } catch (err) {
    return fail(err)
  }
}
