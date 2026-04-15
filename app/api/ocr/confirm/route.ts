import { created, fail } from '@/lib/apiResponse'
import { BadRequestError } from '@/lib/errors'
import { requireAuth } from '@/server/security/authGuard'
import { upsertBulkScores } from '@/server/services/scoreService'
import { z } from 'zod'

const confirmSchema = z.object({
  weekId: z.number().int().positive(),
  dayOfWeek: z.number().int().min(1).max(6),
  rows: z.array(
    z.object({
      playerId: z.number().int().positive(),
      score: z.number().int().min(0),
    }),
  ).min(1),
})

export async function POST(request: Request) {
  try {
    await requireAuth('scores:import')
    const body = await request.json()
    const input = confirmSchema.parse(body)

    if (input.rows.length === 0) {
      throw new BadRequestError('Aucune ligne a importer')
    }

    const imported = await upsertBulkScores(
      {
        weekId: input.weekId,
        scores: input.rows.map((row) => ({
          playerId: row.playerId,
          dayOfWeek: input.dayOfWeek as 1 | 2 | 3 | 4 | 5 | 6,
          score: row.score,
        })),
      },
      'ocr',
    )

    return created({ imported, weekId: input.weekId, dayOfWeek: input.dayOfWeek })
  } catch (err) {
    return fail(err)
  }
}
