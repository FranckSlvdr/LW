import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/server/security/authGuard'
import { parseOcrText } from '@/server/engines/ocr/ocrParser'
import { findAllPlayers } from '@/server/repositories/playerRepository'
import { BadRequestError } from '@/lib/errors'
import { z } from 'zod'
import type { OcrParseResultApi, PlayerApi } from '@/types/api'
import type { OcrProfileName } from '@/server/engines/ocr/ocrParser'

const parseSchema = z.object({
  text:    z.string().min(1).max(50_000),
  profile: z.enum(['lastwar-vs', 'generic']).default('lastwar-vs'),
})

export async function POST(request: Request) {
  try {
    await requireAuth('scores:import')
    const body    = await request.json()
    const { text, profile } = parseSchema.parse(body)

    if (text.trim().length === 0) throw new BadRequestError('Texte OCR vide')

    // Load active players for matching
    const allPlayers = await findAllPlayers()
    const activePlayers = allPlayers
      .filter((p) => p.isActive)
      .map((p) => ({
        id:             p.id,
        name:           p.name,
        normalizedName: p.normalizedName,
        alias:          p.alias,
      }))

    const result = parseOcrText(text, profile as OcrProfileName, activePlayers)

    // Build player list for UI dropdowns (all active, not just matched)
    const playersApi: PlayerApi[] = allPlayers
      .filter((p) => p.isActive)
      .map((p) => ({
        id:            p.id,
        name:          p.name,
        alias:         p.alias,
        currentRank:   p.currentRank,
        suggestedRank: p.suggestedRank,
        rankReason:    p.rankReason,
        isActive:      p.isActive,
        joinedAt:      p.joinedAt?.toISOString() ?? null,
        leftAt:        p.leftAt?.toISOString()   ?? null,
      }))

    const response: OcrParseResultApi = {
      profile:   result.profile,
      rows:      result.rows,
      discarded: result.discarded,
      players:   playersApi,
      summary:   result.summary,
    }

    return ok(response)
  } catch (err) {
    return fail(err)
  }
}
