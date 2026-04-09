import { ok, created, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/server/security/authGuard'
import { getDsScoresForWeek, upsertDsScoreForPlayer, removeDsScore } from '@/server/services/desertStormService'
import { ValidationError } from '@/lib/errors'
import { z } from 'zod'

const upsertSchema = z.object({
  playerId: z.number().int().positive(),
  weekId:   z.number().int().positive(),
  score:    z.number().int().min(0),
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
    const scores = await getDsScoresForWeek(weekId)
    return ok(scores)
  } catch (err) {
    return fail(err)
  }
}

export async function POST(request: Request) {
  try {
    await requireAuth('scores:edit')
    const body   = await request.json()
    const input  = upsertSchema.parse(body)
    const result = await upsertDsScoreForPlayer(input)
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
    await removeDsScore(input.playerId, input.weekId)
    return ok({ deleted: true })
  } catch (err) {
    return fail(err)
  }
}
