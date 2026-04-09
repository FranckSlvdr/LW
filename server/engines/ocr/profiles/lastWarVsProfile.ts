/**
 * Last War VS Profile
 *
 * Specialized OCR parser for Last War VS score screenshots.
 *
 * ─── EXPECTED SCREENSHOT STRUCTURE ──────────────────────────────────────────
 * The VS leaderboard screen typically shows:
 *
 *   Alliance VS Score    ← header (discarded)
 *   Week 14              ← header (discarded)
 *   #1  PlayerName1    12,345,678
 *   #2  PlayerName2     9,876,543
 *   ...
 *
 * OCR may fragment rows:
 *   - All on one line:   "1 PlayerName 12345678"
 *   - Name/score split:  "PlayerName\n12,345,678"
 *   - With rank:         "#1\nPlayerName\n12,345,678"
 *
 * ─── PARSING STRATEGY ────────────────────────────────────────────────────────
 * 1. Clean and split into lines
 * 2. Classify each line (RANK, UI_NOISE, SCORE, NAME, MIXED)
 * 3. Group consecutive lines into CandidateRows
 * 4. Extract and normalize name + score from each group
 * 5. Score confidence, detect issues, match players
 */

import { normalizePlayerName } from '@/lib/utils'
import { matchPlayer } from '../playerMatcher'
import type {
  OcrProfile,
  OcrParseResult,
  ParsedOcrRow,
  DiscardedOcrLine,
  ParseIssue,
  PlayerForMatching,
} from '../types'

// ─── Constants ────────────────────────────────────────────────────────────────

/** Minimum score value to be considered a valid VS score (10k) */
const MIN_SCORE = 10_000
/** Maximum plausible VS score (10 billion) */
const MAX_SCORE = 9_999_999_999

/** UI keywords that indicate a line should be discarded */
const UI_KEYWORDS = new Set([
  'vs', 'score', 'alliance', 'rank', 'total', 'player', 'players',
  'top', 'weekly', 'leaderboard', 'season', 'chapter', 'rewards',
  'confirm', 'cancel', 'back', 'menu', 'reward', 'event', 'info',
  'guild', 'war', 'battle', 'details', 'close', 'share', 'more',
  'loading', 'settings', 'home', 'chat', 'ok', 'yes', 'no',
])

// ─── Line types ───────────────────────────────────────────────────────────────

type LineType =
  | 'rank'      // pure rank number (#1, 1, etc.)
  | 'score'     // large number (likely VS score)
  | 'name'      // text token (likely player name)
  | 'mixed'     // contains both name tokens and a score candidate
  | 'ui_noise'  // UI label / header / button / decorative
  | 'empty'

interface ClassifiedLine {
  index: number
  raw: string
  cleaned: string
  type: LineType
  /** Best score candidate found in this line */
  scoreCandidate: { raw: string; value: number; corrections: string[] } | null
  /** Best name candidate extracted from this line */
  nameCandidate: string | null
}

// ─── Profile implementation ───────────────────────────────────────────────────

export const lastWarVsProfile: OcrProfile = {
  name: 'lastwar-vs',

  parse(rawText: string, players: PlayerForMatching[]): OcrParseResult {
    const lines = splitLines(rawText)
    const classified = lines.map((line, i) => classifyLine(line, i))

    const discarded: DiscardedOcrLine[] = []
    const rows: ParsedOcrRow[] = []
    const seenKeys = new Set<string>() // "normalizedName:score" for dup detection

    // Group lines into candidate rows
    const groups = groupLines(classified, discarded)

    let rowIndex = 0
    for (const group of groups) {
      const parsed = buildParsedRow(group, rowIndex, players, seenKeys)
      rows.push(parsed)
      if (parsed.extractedScore !== null) {
        const key = `${normalizePlayerName(parsed.extractedName)}:${parsed.extractedScore}`
        seenKeys.add(key)
      }
      rowIndex++
    }

    return {
      profile: 'lastwar-vs',
      rows,
      discarded,
      summary: buildSummary(rows),
    }
  },
}

// ─── Line splitting ───────────────────────────────────────────────────────────

function splitLines(text: string): string[] {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
}

// ─── Line classification ──────────────────────────────────────────────────────

function classifyLine(raw: string, index: number): ClassifiedLine {
  const cleaned = cleanLine(raw)

  if (cleaned.length === 0) {
    return { index, raw, cleaned, type: 'empty', scoreCandidate: null, nameCandidate: null }
  }

  // Rank-only: "#1", "1.", "01", single 1-2 digit number
  if (/^#?\d{1,2}\.?$/.test(cleaned)) {
    return { index, raw, cleaned, type: 'rank', scoreCandidate: null, nameCandidate: null }
  }

  // Pure UI noise?
  if (isUiNoise(cleaned)) {
    return { index, raw, cleaned, type: 'ui_noise', scoreCandidate: null, nameCandidate: null }
  }

  // Try to extract score candidate
  const scoreCandidate = extractScoreToken(cleaned)

  // Extract name candidate (strip score portion if present)
  const nameCandidate = extractNameToken(cleaned, scoreCandidate?.raw ?? null)

  // Classify based on what we found
  if (scoreCandidate && nameCandidate && nameCandidate.length >= 2) {
    return { index, raw, cleaned, type: 'mixed', scoreCandidate, nameCandidate }
  }

  if (scoreCandidate && !nameCandidate) {
    return { index, raw, cleaned, type: 'score', scoreCandidate, nameCandidate: null }
  }

  if (!scoreCandidate && nameCandidate) {
    return { index, raw, cleaned, type: 'name', scoreCandidate: null, nameCandidate }
  }

  // Has text but couldn't cleanly classify — treat as potential name
  return { index, raw, cleaned, type: 'name', scoreCandidate: null, nameCandidate: cleaned }
}

function cleanLine(raw: string): string {
  return raw
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-width chars
    .replace(/\s+/g, ' ')
    .trim()
}

function isUiNoise(text: string): boolean {
  const lower = text.toLowerCase().replace(/[^a-z\s]/g, '').trim()

  // Pure UI keyword
  if (UI_KEYWORDS.has(lower)) return true

  // Short all-symbol string (decorative)
  if (text.replace(/[^a-z0-9]/gi, '').length === 0) return true

  // Very long non-name looking text (likely a description)
  if (text.length > 60 && !/\d{5,}/.test(text)) return true

  return false
}

// ─── Score extraction ─────────────────────────────────────────────────────────

interface ScoreCandidate {
  raw: string
  value: number
  corrections: string[]
}

/**
 * Finds the best score candidate in a line.
 * Applies OCR glyph corrections and picks the largest plausible number.
 */
function extractScoreToken(line: string): ScoreCandidate | null {
  // Split on whitespace and common separators, keeping each chunk
  const chunks = line.split(/[\s,./|\\]+/).filter((c) => c.length >= 3)

  let best: ScoreCandidate | null = null

  for (const chunk of chunks) {
    const result = tryParseScore(chunk)
    if (!result) continue
    if (result.value < MIN_SCORE || result.value > MAX_SCORE) continue
    if (!best || result.value > best.value) {
      best = result
    }
  }

  // Also try concatenating adjacent numeric-looking chunks (handles "12 345 678")
  const concatResult = tryParseConcatenated(line)
  if (concatResult && concatResult.value >= MIN_SCORE && concatResult.value <= MAX_SCORE) {
    if (!best || concatResult.value > best.value) {
      best = concatResult
    }
  }

  return best
}

function tryParseScore(chunk: string): ScoreCandidate | null {
  const corrections: string[] = []
  let s = chunk

  // Remove common score separators embedded in the token
  s = s.replace(/[,._\s]/g, '')

  // Apply OCR glyph corrections — only in likely numeric context
  // (chunk must be mostly digits after separator removal)
  const digitRatio = (s.match(/\d/g)?.length ?? 0) / s.length
  if (digitRatio >= 0.6) {
    const before = s
    s = s
      .replace(/[Oo]/g, '0')
      .replace(/[Il|]/g, '1')
      .replace(/[Ss]/g, '5')
      .replace(/[Bb]/g, '8')
    if (s !== before) {
      corrections.push(`OCR glyph corrections applied in "${chunk}"`)
    }
  }

  // Now strip anything that's not a digit
  const digits = s.replace(/\D/g, '')
  if (digits.length < 5) return null

  const value = parseInt(digits, 10)
  if (isNaN(value)) return null

  return { raw: chunk, value, corrections }
}

/**
 * Tries to parse concatenated numeric chunks like "12 345 678".
 * Looks for sequences of 2-3 digit groups separated by spaces.
 */
function tryParseConcatenated(line: string): ScoreCandidate | null {
  // Match sequences of digit groups: e.g. "12 345 678" or "1 234 567"
  const match = line.match(/\d{1,3}(?:[\s,._]\d{3}){1,4}/)
  if (!match) return null

  const raw = match[0]
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 5) return null

  const value = parseInt(digits, 10)
  if (isNaN(value)) return null

  return { raw, value, corrections: [] }
}

// ─── Name extraction ──────────────────────────────────────────────────────────

/**
 * Extracts the player name portion of a line, stripping:
 * - rank prefix (#1, 1., etc.)
 * - score fragment (if scoreRaw is provided)
 * - clan tags [TAG] or (TAG)
 * - leading/trailing punctuation
 * - short pure-symbol tokens
 */
function extractNameToken(line: string, scoreRaw: string | null): string | null {
  let s = line

  // Remove score fragment
  if (scoreRaw) {
    s = s.replace(scoreRaw, '').trim()
    // Also try removing the cleaned score digits
    const digits = scoreRaw.replace(/\D/g, '')
    if (digits.length >= 5) {
      s = s.replace(new RegExp(digits.replace(/./g, (c) => `[${c}Oo]`).substring(0, 20)), '').trim()
    }
  }

  // Remove rank prefix
  s = s.replace(/^#?\d{1,3}[.\s]?\s*/, '').trim()

  // Remove clan tags: [TAG], (TAG), {TAG}
  s = s.replace(/[\[({][A-Z0-9_\-]{1,8}[\])}]/gi, '').trim()

  // Remove common Last War decorative symbols
  s = s.replace(/[★☆✦✧⭐◆◇■□▲▶◀»«·•*~^|_=+]/g, ' ').trim()

  // Collapse multiple spaces
  s = s.replace(/\s+/g, ' ').trim()

  // Remove leading/trailing digits that look like leftover rank/score
  s = s.replace(/^\d+\s*/, '').replace(/\s*\d+$/, '').trim()

  // Must have at least 2 meaningful characters after cleanup
  if (s.replace(/\W/g, '').length < 2) return null

  // Looks like pure number → not a name
  if (/^\d+$/.test(s.replace(/\s/g, ''))) return null

  return s.length > 0 ? s : null
}

// ─── Line grouping ────────────────────────────────────────────────────────────

interface CandidateGroup {
  lines: ClassifiedLine[]
  rawText: string
  mergedLines: boolean
}

/**
 * Groups classified lines into candidate [name + score] pairs.
 *
 * Strategy:
 * - MIXED lines → standalone group
 * - NAME followed by SCORE (optionally preceded by RANK) → merged group
 * - RANK + NAME + SCORE → merged group
 * - Isolated NAME or SCORE lines → standalone (low confidence)
 * - UI_NOISE and RANK lines → discarded
 */
function groupLines(
  lines: ClassifiedLine[],
  discarded: DiscardedOcrLine[],
): CandidateGroup[] {
  const groups: CandidateGroup[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]!

    // Skip empty
    if (line.type === 'empty') { i++; continue }

    // Discard UI noise
    if (line.type === 'ui_noise') {
      discarded.push({ lineIndex: line.index, text: line.raw, reason: 'UI label / noise' })
      i++; continue
    }

    // MIXED: complete row on one line
    if (line.type === 'mixed') {
      groups.push({ lines: [line], rawText: line.raw, mergedLines: false })
      i++; continue
    }

    // RANK: look ahead
    if (line.type === 'rank') {
      const next1 = lines[i + 1]
      const next2 = lines[i + 2]

      if (next1?.type === 'mixed') {
        // rank + mixed → use mixed
        groups.push({ lines: [next1], rawText: `${line.raw} ${next1.raw}`, mergedLines: true })
        i += 2; continue
      }

      if (next1?.type === 'name' && next2?.type === 'score') {
        // rank + name + score
        groups.push({
          lines: [next1, next2],
          rawText: `${line.raw} ${next1.raw} ${next2.raw}`,
          mergedLines: true,
        })
        i += 3; continue
      }

      if (next1?.type === 'name') {
        // rank + name (no score visible)
        groups.push({ lines: [next1], rawText: `${line.raw} ${next1.raw}`, mergedLines: true })
        i += 2; continue
      }

      // Standalone rank → discard
      discarded.push({ lineIndex: line.index, text: line.raw, reason: 'Isolated rank number' })
      i++; continue
    }

    // NAME: check if next is a score
    if (line.type === 'name') {
      const next = lines[i + 1]

      if (next?.type === 'score') {
        groups.push({
          lines: [line, next],
          rawText: `${line.raw} ${next.raw}`,
          mergedLines: true,
        })
        i += 2; continue
      }

      // Name with no following score → low confidence standalone
      groups.push({ lines: [line], rawText: line.raw, mergedLines: false })
      i++; continue
    }

    // SCORE: orphaned score (no preceding name was merged)
    if (line.type === 'score') {
      discarded.push({ lineIndex: line.index, text: line.raw, reason: 'Orphaned score line (no preceding name)' })
      i++; continue
    }

    i++
  }

  return groups
}

// ─── Row building ─────────────────────────────────────────────────────────────

function buildParsedRow(
  group: CandidateGroup,
  rowIndex: number,
  players: PlayerForMatching[],
  seenKeys: Set<string>,
): ParsedOcrRow {
  const issues: ParseIssue[] = []
  const ocrCorrections: string[] = []

  // Collect score and name from the group lines
  let scoreCandidate: ScoreCandidate | null = null
  let extractedName = ''

  for (const line of group.lines) {
    if (line.scoreCandidate && !scoreCandidate) {
      scoreCandidate = line.scoreCandidate
    }
    if (line.nameCandidate && !extractedName) {
      extractedName = line.nameCandidate
    }
  }

  if (scoreCandidate) {
    ocrCorrections.push(...scoreCandidate.corrections)
    if (scoreCandidate.corrections.length > 0) {
      issues.push('possible_ocr_noise')
    }
  }

  const extractedScore = scoreCandidate?.value ?? null

  // Validate score
  if (extractedScore === null) {
    issues.push('invalid_score')
  } else if (extractedScore < MIN_SCORE) {
    issues.push('score_too_small')
  }

  // Validate name
  if (!extractedName || extractedName.trim().length < 2) {
    extractedName = ''
  }

  // Check for truncated name (less than 3 chars after cleanup)
  if (extractedName.length > 0 && extractedName.replace(/\W/g, '').length <= 3) {
    issues.push('name_truncated')
  }

  // Merged lines note
  if (group.mergedLines) {
    issues.push('merged_lines')
  }

  // Duplicate detection
  if (extractedScore !== null && extractedName) {
    const key = `${normalizePlayerName(extractedName)}:${extractedScore}`
    if (seenKeys.has(key)) {
      issues.push('duplicate_row')
    }
  }

  // Player matching
  const playerMatch = extractedName
    ? matchPlayer(extractedName, players)
    : null

  if (!playerMatch || playerMatch.matchType === 'none') {
    issues.push('unresolved_player')
  } else if (playerMatch.matchType === 'fuzzy' && playerMatch.confidence < 0.7) {
    issues.push('ambiguous_player')
  }

  // Confidence scoring
  const confidence = computeConfidence({
    hasName: extractedName.length > 0,
    hasScore: extractedScore !== null,
    scoreValid: extractedScore !== null && extractedScore >= MIN_SCORE,
    playerMatchConfidence: playerMatch?.confidence ?? 0,
    ocrCorrectionsApplied: ocrCorrections.length > 0,
    isMerged: group.mergedLines,
    nameLength: extractedName.length,
  })

  if (confidence < 0.5) issues.push('low_confidence')

  return {
    rowIndex,
    rawText: group.rawText,
    extractedName,
    extractedScore,
    confidence,
    issues: [...new Set(issues)], // deduplicate
    playerMatch,
    ocrCorrections,
  }
}

// ─── Confidence scoring ───────────────────────────────────────────────────────

interface ConfidenceInput {
  hasName: boolean
  hasScore: boolean
  scoreValid: boolean
  playerMatchConfidence: number
  ocrCorrectionsApplied: boolean
  isMerged: boolean
  nameLength: number
}

function computeConfidence(c: ConfidenceInput): number {
  let score = 0

  // Structure
  if (c.hasName && c.hasScore) score += 0.35
  else if (c.hasName || c.hasScore) score += 0.10

  // Score quality
  if (c.scoreValid) score += 0.20

  // Name quality
  if (c.nameLength >= 4) score += 0.10
  else if (c.nameLength >= 2) score += 0.05

  // Player match quality
  score += c.playerMatchConfidence * 0.35

  // Penalties
  if (c.ocrCorrectionsApplied) score -= 0.08
  if (c.isMerged) score -= 0.03 // small penalty for merged lines (slightly less certain)

  return Math.max(0, Math.min(1, score))
}

// ─── Summary ──────────────────────────────────────────────────────────────────

function buildSummary(rows: ParsedOcrRow[]): OcrParseResult['summary'] {
  return {
    total: rows.length,
    highConfidence:   rows.filter((r) => r.confidence >= 0.8).length,
    mediumConfidence: rows.filter((r) => r.confidence >= 0.5 && r.confidence < 0.8).length,
    lowConfidence:    rows.filter((r) => r.confidence < 0.5).length,
    unresolved:       rows.filter((r) => !r.playerMatch || r.playerMatch.matchType === 'none').length,
  }
}
