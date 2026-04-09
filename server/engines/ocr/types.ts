/**
 * OCR Engine Types
 *
 * Shared types for the OCR parsing pipeline.
 * Pure TypeScript — no runtime dependencies.
 *
 * ─── EXTENSION HOOK ─────────────────────────────────────────────────────────
 * ParsedOcrRow stores `ocrCorrections` and `rawText` so that future builds
 * can replay corrected rows back into the matching heuristics:
 *   - name corrections → refine normalizePlayerName mappings
 *   - score corrections → refine OCR glyph substitution tables
 * No ML yet — just structured data ready for supervised collection.
 * ────────────────────────────────────────────────────────────────────────────
 */

// ─── Player input for matching ────────────────────────────────────────────────

export interface PlayerForMatching {
  id: number
  name: string
  normalizedName: string
  alias: string | null
}

// ─── Match result ─────────────────────────────────────────────────────────────

export type MatchType = 'exact' | 'alias' | 'fuzzy' | 'none'

export interface PlayerMatchResult {
  playerId: number
  playerName: string
  matchType: MatchType
  /** 0–1. exact=1.0, alias=0.9, fuzzy varies, none=0 */
  confidence: number
}

// ─── Issues ───────────────────────────────────────────────────────────────────

export type ParseIssue =
  | 'low_confidence'        // overall confidence < 0.5
  | 'unresolved_player'     // no player match found
  | 'invalid_score'         // score could not be parsed
  | 'possible_ocr_noise'    // OCR corrections were applied
  | 'duplicate_row'         // same player+score already in this parse batch
  | 'score_too_small'       // score below minimum threshold
  | 'merged_lines'          // name and score were on separate OCR lines
  | 'name_truncated'        // name looks like it might be cut off
  | 'ambiguous_player'      // multiple players match with similar confidence

// ─── Parsed row ───────────────────────────────────────────────────────────────

export interface ParsedOcrRow {
  /** 0-based index in the ordered result list */
  rowIndex: number
  /** Original OCR text that produced this row (may span multiple lines) */
  rawText: string
  /** Best name candidate extracted from OCR */
  extractedName: string
  /** Best score candidate, null if extraction failed */
  extractedScore: number | null
  /** Overall confidence 0–1 */
  confidence: number
  /** Issues detected for this row */
  issues: ParseIssue[]
  /** Best player match, null if no player table provided or no match */
  playerMatch: PlayerMatchResult | null
  /**
   * Human-readable descriptions of OCR corrections applied.
   * e.g. ["O→0 in score position 3", "removed clan tag [WAR]"]
   * Stored for future improvement of correction heuristics.
   */
  ocrCorrections: string[]
}

// ─── Discarded line ───────────────────────────────────────────────────────────

export interface DiscardedOcrLine {
  lineIndex: number
  text: string
  reason: string
}

// ─── Parse result ─────────────────────────────────────────────────────────────

export interface OcrParseResult {
  /** Profile that produced this result */
  profile: string
  rows: ParsedOcrRow[]
  discarded: DiscardedOcrLine[]
  summary: {
    total: number
    /** confidence >= 0.8 */
    highConfidence: number
    /** confidence >= 0.5 and < 0.8 */
    mediumConfidence: number
    /** confidence < 0.5 */
    lowConfidence: number
    /** playerMatch === null or matchType === 'none' */
    unresolved: number
  }
}

// ─── Profile interface ────────────────────────────────────────────────────────

export interface OcrProfile {
  readonly name: string
  /**
   * Parse raw OCR text and return structured rows.
   * @param rawText  Full OCR text output (newline-separated)
   * @param players  Known players for matching (may be empty)
   */
  parse(rawText: string, players: PlayerForMatching[]): OcrParseResult
}
