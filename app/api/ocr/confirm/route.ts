import { created, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/server/security/authGuard'
import { upsertScoresBulk } from '@/server/repositories/scoreRepository'
import { findWeekById } from '@/server/repositories/weekRepository'
import { NotFoundError, UnprocessableError, BadRequestError } from '@/lib/errors'
import { z } from 'zod'

const confirmSchema = z.object({
  weekId:     z.number().int().positive(),
  dayOfWeek:  z.number().int().min(1).max(6),
  rows: z.array(
    z.object({
      playerId: z.number().int().positive(),
      score:    z.number().int().min(0),
    }),
  ).min(1),
})

export async function POST(request: Request) {
  try {
    await requireAuth('scores:import')
    const body  = await request.json()
    const input = confirmSchema.parse(body)

    const week = await findWeekById(input.weekId)
    if (!week) throw new NotFoundError('Week', input.weekId)
    if (week.isLocked) throw new UnprocessableError('Cette semaine est verrouillée')

    if (input.rows.length === 0) throw new BadRequestError('Aucune ligne à importer')

    const imported = await upsertScoresBulk(
      {
        weekId: input.weekId,
        scores: input.rows.map((r) => ({
          playerId:  r.playerId,
          dayOfWeek: input.dayOfWeek as 1 | 2 | 3 | 4 | 5 | 6,
          score:     r.score,
        })),
      },
      'ocr',
    )

    return created({ imported, weekId: input.weekId, dayOfWeek: input.dayOfWeek })
  } catch (err) {
    return fail(err)
  }
}
