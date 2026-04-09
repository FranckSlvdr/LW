/**
 * Input sanitization utilities — called before validation.
 *
 * These functions clean raw input before Zod validation runs.
 * They do NOT validate — they normalize to reduce false negatives.
 *
 * Note: SQL injection protection comes from parameterized queries
 * in the repositories, not from this layer. This layer handles
 * string normalization only.
 */

/**
 * Strips leading/trailing whitespace and collapses internal whitespace.
 * Safe to apply to any string field.
 */
export function sanitizeString(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\s+/g, ' ')
}

/**
 * Sanitizes a player name: strips, collapses whitespace, limits length.
 */
export function sanitizePlayerName(value: unknown): string {
  return sanitizeString(value).slice(0, 100)
}

/**
 * Sanitizes a CSV row object: trims all string values, removes null bytes.
 * Returns a new object — does not mutate the input.
 */
export function sanitizeCsvRow(
  row: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(row)) {
    if (typeof value === 'string') {
      // Remove null bytes (common in malformed CSVs) and trim
      result[key] = value.replace(/\0/g, '').trim()
    } else {
      result[key] = value
    }
  }

  return result
}

/**
 * Converts a raw score string to a positive integer.
 * Strips spaces, commas, dots used as thousand separators.
 * Returns null if the result is not a valid positive integer.
 */
export function sanitizeScore(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? Math.floor(value) : null
  }
  if (typeof value !== 'string') return null

  // Strip thousand separators (spaces, commas, periods when not decimal)
  const cleaned = value.trim().replace(/[\s,]/g, '').replace(/\.(?=\d{3})/g, '')
  const n = Number(cleaned)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.floor(n)
}
