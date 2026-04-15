/**
 * Import Processor — pure computation, no DB access.
 *
 * Responsibility: parse, sanitize, validate and classify CSV rows.
 * The caller (importService) handles DB operations and deduplication
 * against existing data.
 *
 * Pipeline per row:
 *   1. Parse CSV → raw Record<string, string>
 *   2. Sanitize (trim, null-byte removal)
 *   3. Validate with Zod schema
 *   4. Normalize (player name → normalized_name for dedup)
 *   5. Check for intra-file duplicates (same file, repeated rows)
 *   6. Classify: valid | skipped (dup) | error
 *
 * The result is directly consumable by importService without further parsing.
 */

import { normalizePlayerName } from '@/lib/utils'
import { sanitizeCsvRow, sanitizeScore } from '@/server/security/sanitize'
import { importPlayerRowSchema } from '@/server/validators/playerValidator'
import { importScoreRowSchema } from '@/server/validators/scoreValidator'
import type { ImportError } from '@/types/domain'

// ─── Public interface ─────────────────────────────────────────────────────────

export type ImportProcessorType = 'players' | 'scores'

export interface ProcessedPlayer {
  name: string
  normalizedName: string
  alias?: string
  currentRank?: string | null
  isActive?: boolean
  generalLevel?: number | null
  professionKey?: string | null
  professionLevel?: number | null
}

export interface ProcessedScore {
  playerName: string
  normalizedPlayerName: string
  dayOfWeek: number
  score: number
}

export interface ProcessorRow<T> {
  rowNumber: number
  raw: Record<string, string>
  normalized: T
}

export interface ImportProcessorResult<T> {
  valid: ProcessorRow<T>[]
  skipped: Array<{ rowNumber: number; raw: Record<string, string>; reason: string }>
  errors: Array<{ rowNumber: number; raw: Record<string, string>; error: ImportError }>
  summary: {
    total: number
    valid: number
    skipped: number
    errors: number
  }
}

// ─── Entry points ─────────────────────────────────────────────────────────────

export function processPlayerImport(
  csvContent: string,
): ImportProcessorResult<ProcessedPlayer> {
  const rows = parseCsv(csvContent)
  const seenNames = new Set<string>()
  const valid: ImportProcessorResult<ProcessedPlayer>['valid'] = []
  const skipped: ImportProcessorResult<ProcessedPlayer>['skipped'] = []
  const errors: ImportProcessorResult<ProcessedPlayer>['errors'] = []

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2 // +2: header is row 1, data starts row 2
    const raw = sanitizeCsvRow(rows[i]) as Record<string, string>

    // Validate with Zod
    const parsed = importPlayerRowSchema.safeParse(raw)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      errors.push({
        rowNumber,
        raw,
        error: {
          row: rowNumber,
          field: issue?.path.join('.'),
          message: issue?.message ?? 'Validation error',
        },
      })
      continue
    }

    const normalizedName = normalizePlayerName(parsed.data.name)

    // Intra-file duplicate detection
    if (seenNames.has(normalizedName)) {
      skipped.push({
        rowNumber,
        raw,
        reason: `Duplicate player name in file: "${parsed.data.name}"`,
      })
      continue
    }

    seenNames.add(normalizedName)

    // Normalize is_active: blank = true, any falsy string = false
    const isActiveRaw = (parsed.data.is_active ?? '').toUpperCase()
    const isActive = isActiveRaw === 'FALSE' || isActiveRaw === '0' ? false : true

    // Normalize current_rank: blank = null (unclassified)
    const currentRank = parsed.data.current_rank?.trim().toUpperCase() || null

    const generalLevel = parsed.data.general_level !== undefined
      ? Number(parsed.data.general_level)
      : null

    const professionKey   = parsed.data.profession_key ?? null
    const professionLevel = parsed.data.profession_level !== undefined
      ? Number(parsed.data.profession_level)
      : null

    valid.push({
      rowNumber,
      raw,
      normalized: {
        name: parsed.data.name,
        normalizedName,
        currentRank,
        isActive,
        generalLevel,
        professionKey,
        professionLevel,
      },
    })
  }

  return buildResult(valid, skipped, errors, rows.length)
}

export function processScoreImport(
  csvContent: string,
): ImportProcessorResult<ProcessedScore> {
  const rows = parseCsv(csvContent)
  const seenKeys = new Set<string>() // "normalizedName:dayOfWeek"
  const valid: ImportProcessorResult<ProcessedScore>['valid'] = []
  const skipped: ImportProcessorResult<ProcessedScore>['skipped'] = []
  const errors: ImportProcessorResult<ProcessedScore>['errors'] = []

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2
    const raw = sanitizeCsvRow(rows[i]) as Record<string, string>

    // Sanitize score field specifically (handles "1 234 567" formats)
    const sanitizedScore = sanitizeScore(raw.score)
    if (sanitizedScore === null) {
      errors.push({
        rowNumber,
        raw,
        error: {
          row: rowNumber,
          field: 'score',
          message: `Score invalide: "${raw.score}"`,
        },
      })
      continue
    }
    const rawForValidation = { ...raw, score: String(sanitizedScore) }

    // Validate with Zod
    const parsed = importScoreRowSchema.safeParse(rawForValidation)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      errors.push({
        rowNumber,
        raw,
        error: {
          row: rowNumber,
          field: issue?.path.join('.'),
          message: issue?.message ?? 'Validation error',
        },
      })
      continue
    }

    const normalizedPlayerName = normalizePlayerName(parsed.data.player_name)
    const deupKey = `${normalizedPlayerName}:${parsed.data.day_of_week}`

    if (seenKeys.has(deupKey)) {
      skipped.push({
        rowNumber,
        raw,
        reason: `Duplicate: "${parsed.data.player_name}" on day ${parsed.data.day_of_week}`,
      })
      continue
    }

    seenKeys.add(deupKey)
    valid.push({
      rowNumber,
      raw,
      normalized: {
        playerName: parsed.data.player_name,
        normalizedPlayerName,
        dayOfWeek: parsed.data.day_of_week,
        score: parsed.data.score,
      },
    })
  }

  return buildResult(valid, skipped, errors, rows.length)
}

// ─── CSV Parser ───────────────────────────────────────────────────────────────

/**
 * Parses CSV content into an array of raw string objects.
 *
 * Supports:
 * - BOM stripping (common in Windows-generated CSV)
 * - CRLF and LF line endings
 * - Quoted fields (commas inside quotes are preserved)
 * - Escaped quotes ("" inside a quoted field)
 * - Empty line skipping
 * - Case-insensitive, trimmed headers
 */
function parseCsv(content: string): Record<string, string>[] {
  const cleaned = content.replace(/^\uFEFF/, '') // Strip UTF-8 BOM
  const lines = cleaned
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (lines.length < 2) return []

  const headers = splitLine(lines[0]).map((h) => h.toLowerCase().trim())

  return lines.slice(1).map((line) => {
    const values = splitLine(line)
    return Object.fromEntries(
      headers.map((header, i) => [header, values[i]?.trim() ?? '']),
    )
  })
}

/**
 * Splits a single CSV line, respecting quoted fields.
 *
 * "Name","Score VS","Alias"  → ["Name", "Score VS", "Alias"]
 * Smith,"10,000,000",          → ["Smith", "10,000,000", ""]
 */
function splitLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote inside a quoted field
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }

  result.push(current.trim())
  return result
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function buildResult<T>(
  valid: ImportProcessorResult<T>['valid'],
  skipped: ImportProcessorResult<T>['skipped'],
  errors: ImportProcessorResult<T>['errors'],
  total: number,
): ImportProcessorResult<T> {
  return {
    valid,
    skipped,
    errors,
    summary: {
      total,
      valid: valid.length,
      skipped: skipped.length,
      errors: errors.length,
    },
  }
}
