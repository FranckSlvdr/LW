/**
 * Player Matcher
 *
 * Matches an OCR-extracted name string against a list of known players.
 * Returns the best match with a confidence score and match type.
 *
 * Matching cascade (highest confidence wins):
 *   1. Exact normalized match    → 1.0
 *   2. Alias normalized match    → 0.9
 *   3. Fuzzy match by similarity → 0.4–0.85 depending on edit distance
 *
 * ─── FUTURE IMPROVEMENT HOOK ────────────────────────────────────────────────
 * matchPlayer() accepts a `corrections` map that could later be populated
 * from stored OCR correction history. For now it's empty.
 * When user corrections are collected, we can build a substitution table:
 *   { "0rion": "Orion", "l3gend": "legend" }
 * and apply it before the cascade.
 * ────────────────────────────────────────────────────────────────────────────
 */

import { normalizePlayerName } from '@/lib/utils'
import type { PlayerForMatching, PlayerMatchResult } from './types'

// ─── Public entry point ───────────────────────────────────────────────────────

/**
 * Returns the best player match for a raw OCR name token.
 * Returns null if players list is empty.
 */
export function matchPlayer(
  rawName: string,
  players: PlayerForMatching[],
  /** Future: known OCR correction mappings */
  _corrections: Record<string, string> = {},
): PlayerMatchResult | null {
  if (players.length === 0) return null
  if (!rawName || rawName.trim().length === 0) return null

  const normalized = normalizePlayerName(rawName)
  if (normalized.length === 0) return null

  // 1. Exact normalized match
  const exactMatch = players.find((p) => p.normalizedName === normalized)
  if (exactMatch) {
    return { playerId: exactMatch.id, playerName: exactMatch.name, matchType: 'exact', confidence: 1.0 }
  }

  // 2. Alias normalized match
  for (const p of players) {
    if (!p.alias) continue
    const normalizedAlias = normalizePlayerName(p.alias)
    if (normalizedAlias === normalized) {
      return { playerId: p.id, playerName: p.name, matchType: 'alias', confidence: 0.9 }
    }
  }

  // 3. Fuzzy match — pick best candidate above threshold
  const fuzzyResult = bestFuzzyMatch(normalized, players)
  if (fuzzyResult && fuzzyResult.confidence >= 0.45) {
    return fuzzyResult
  }

  // No match
  return { playerId: -1, playerName: '', matchType: 'none', confidence: 0 }
}

/**
 * Finds the best fuzzy match using a combination of:
 * - Containment check (one string contains the other)
 * - Normalized Levenshtein similarity
 *
 * Returns null if no candidate exceeds the minimum threshold.
 */
function bestFuzzyMatch(
  normalized: string,
  players: PlayerForMatching[],
): PlayerMatchResult | null {
  let best: PlayerMatchResult | null = null

  for (const p of players) {
    let confidence = fuzzyConfidence(normalized, p.normalizedName)

    // Also try against alias
    if (p.alias) {
      const aliasNorm = normalizePlayerName(p.alias)
      const aliasConf = fuzzyConfidence(normalized, aliasNorm)
      if (aliasConf > confidence) confidence = aliasConf
    }

    if (confidence > 0 && (!best || confidence > best.confidence)) {
      best = { playerId: p.id, playerName: p.name, matchType: 'fuzzy', confidence }
    }
  }

  return best
}

function fuzzyConfidence(a: string, b: string): number {
  if (!a || !b) return 0

  // Exact after normalization (shouldn't reach here but guard)
  if (a === b) return 1.0

  // Containment check
  if (b.includes(a) || a.includes(b)) {
    const longer = Math.max(a.length, b.length)
    const shorter = Math.min(a.length, b.length)
    // If one is significantly shorter, penalize (avoid matching "al" → "alice")
    if (shorter / longer >= 0.6) return 0.75
  }

  // Levenshtein similarity
  const distance = levenshtein(a, b)
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1.0
  const similarity = 1 - distance / maxLen

  // Only return meaningful similarities (avoid noise)
  return similarity >= 0.5 ? similarity * 0.85 : 0 // scale down to distinguish from exact/alias
}

// ─── Levenshtein distance ─────────────────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length

  // Use single array (space-efficient)
  const row = Array.from({ length: n + 1 }, (_, i) => i)

  for (let i = 1; i <= m; i++) {
    let prev = i
    for (let j = 1; j <= n; j++) {
      const val =
        a[i - 1] === b[j - 1]
          ? row[j - 1]!
          : 1 + Math.min(row[j - 1]!, row[j]!, prev)
      row[j - 1] = prev
      prev = val
    }
    row[n] = prev
  }

  return row[n]!
}
