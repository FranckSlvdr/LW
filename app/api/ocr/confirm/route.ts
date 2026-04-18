import { z } from 'zod'
import { created, fail } from '@/lib/apiResponse'
import { BadRequestError } from '@/lib/errors'
import {
  HEAVY_API_RATE_LIMIT,
  buildRateLimitIdentifier,
  rateLimit,
  rateLimitResponse,
} from '@/lib/rateLimit'
import { requireAuth } from '@/server/security/authGuard'
import { upsertBulkScores } from '@/server/services/scoreService'

const confirmSchema = z.object({
  weekId: z.number().int().positive(),
  dayOfWeek: z.number().int().min(1).max(6),
  rows: z
    .array(
      z.object({
        playerId: z.number().int().positive(),
        score: z.number().int().min(0),
      }),
    )
    .min(1),
})

export async function POST(request: Request) {
  try {
    const actor = await requireAuth('scores:import')
    const limit = await rateLimit(
      'ocr:confirm',
      buildRateLimitIdentifier(request, actor.id),
      HEAVY_API_RATE_LIMIT,
    )
    if (!limit.ok) {
      return rateLimitResponse(limit, 'Trop d imports OCR en peu de temps.')
    }

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

    return created({
      imported,
      weekId: input.weekId,
      dayOfWeek: input.dayOfWeek,
    })
  } catch (err) {
    return fail(err)
  }
}
