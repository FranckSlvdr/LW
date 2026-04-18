import { z } from 'zod'
import { ok, fail } from '@/lib/apiResponse'
import { BadRequestError } from '@/lib/errors'
import type { OcrParseResultApi, PlayerApi } from '@/types/api'
import type { OcrProfileName } from '@/server/engines/ocr/ocrParser'
import {
  HEAVY_API_RATE_LIMIT,
  buildRateLimitIdentifier,
  rateLimit,
  rateLimitResponse,
} from '@/lib/rateLimit'
import { parseOcrText } from '@/server/engines/ocr/ocrParser'
import { findAllPlayers } from '@/server/repositories/playerRepository'
import { requireAuth } from '@/server/security/authGuard'

const parseSchema = z.object({
  text: z.string().min(1).max(50_000),
  profile: z.enum(['lastwar-vs', 'generic']).default('lastwar-vs'),
})

export async function POST(request: Request) {
  try {
    const actor = await requireAuth('scores:import')
    const limit = await rateLimit(
      'ocr:parse',
      buildRateLimitIdentifier(request, actor.id),
      HEAVY_API_RATE_LIMIT,
    )
    if (!limit.ok) {
      return rateLimitResponse(limit, 'Trop danalyses OCR en peu de temps.')
    }

    const body = await request.json()
    const { text, profile } = parseSchema.parse(body)

    if (text.trim().length === 0) {
      throw new BadRequestError('Texte OCR vide')
    }

    const allPlayers = await findAllPlayers()
    const activePlayers = allPlayers
      .filter((player) => player.isActive)
      .map((player) => ({
        id: player.id,
        name: player.name,
        normalizedName: player.normalizedName,
        alias: player.alias,
      }))

    const result = parseOcrText(
      text,
      profile as OcrProfileName,
      activePlayers,
    )

    const playersApi: PlayerApi[] = allPlayers
      .filter((player) => player.isActive)
      .map((player) => ({
        id: player.id,
        name: player.name,
        alias: player.alias,
        currentRank: player.currentRank,
        suggestedRank: player.suggestedRank,
        rankReason: player.rankReason,
        isActive: player.isActive,
        joinedAt: player.joinedAt?.toISOString() ?? null,
        leftAt: player.leftAt?.toISOString() ?? null,
        generalLevel: player.generalLevel,
        professionKey: player.professionKey,
        professionLevel: player.professionLevel,
      }))

    const response: OcrParseResultApi = {
      profile: result.profile,
      rows: result.rows,
      discarded: result.discarded,
      players: playersApi,
      summary: result.summary,
    }

    return ok(response)
  } catch (err) {
    return fail(err)
  }
}
