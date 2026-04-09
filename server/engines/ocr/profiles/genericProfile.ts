/**
 * Generic OCR Profile
 *
 * Minimal fallback profile. Tries to extract rows containing both a text
 * token and a large numeric token from any free-form OCR text.
 *
 * Much less accurate than the Last War VS profile — intended as a safe
 * fallback when the source game/screenshot format is unknown.
 */

import { matchPlayer } from '../playerMatcher'
import type { OcrProfile, OcrParseResult, ParsedOcrRow, PlayerForMatching } from '../types'

export const genericProfile: OcrProfile = {
  name: 'generic',

  parse(rawText: string, players: PlayerForMatching[]): OcrParseResult {
    const lines = rawText
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)

    const rows: ParsedOcrRow[] = []
    let rowIndex = 0

    for (const line of lines) {
      // Look for a large number
      const numMatch = line.match(/\b\d[\d,.\s]{4,}\b/)
      if (!numMatch) continue

      const digits = numMatch[0].replace(/\D/g, '')
      const score = parseInt(digits, 10)
      if (isNaN(score) || score < 10_000) continue

      // Name = everything that isn't the number token
      const nameRaw = line.replace(numMatch[0], '').replace(/[^a-zA-Z0-9\s\-_']/g, ' ').replace(/\s+/g, ' ').trim()
      if (nameRaw.length < 2) continue

      const playerMatch = matchPlayer(nameRaw, players)

      rows.push({
        rowIndex: rowIndex++,
        rawText: line,
        extractedName: nameRaw,
        extractedScore: score,
        confidence: playerMatch?.confidence
          ? Math.min(0.65, 0.3 + playerMatch.confidence * 0.35)
          : 0.3,
        issues: [
          ...((!playerMatch || playerMatch.matchType === 'none') ? ['unresolved_player' as const] : []),
          'low_confidence' as const,
        ],
        playerMatch,
        ocrCorrections: [],
      })
    }

    return {
      profile: 'generic',
      rows,
      discarded: [],
      summary: {
        total: rows.length,
        highConfidence: 0,
        mediumConfidence: rows.filter((r) => r.confidence >= 0.5).length,
        lowConfidence:    rows.filter((r) => r.confidence < 0.5).length,
        unresolved:       rows.filter((r) => !r.playerMatch || r.playerMatch.matchType === 'none').length,
      },
    }
  },
}
