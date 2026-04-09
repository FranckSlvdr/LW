/**
 * Pure utility functions — no side effects, no external dependencies.
 * Safe to import on both client and server.
 */

import type { DayOfWeek } from '@/types/domain'
import { UnprocessableError } from '@/lib/errors'

// ─── Player names ────────────────────────────────────────────────────────────

/**
 * Normalizes a player name for deduplication and comparison.
 * Removes diacritics, lowercases, strips non-alphanumeric characters.
 *
 * "Ñoño" → "nono"
 * "  Iron Man  " → "iron man"
 */
export function normalizePlayerName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // Strip diacritics
    .replace(/[^a-z0-9\s]/g, '')      // Keep alphanumeric + spaces
    .replace(/\s+/g, ' ')             // Collapse multiple spaces
    .trim()
}

// ─── Score formatting ────────────────────────────────────────────────────────

/**
 * Formats a score for display using French locale.
 * 1234567 → "1 234 567"
 */
export function formatScore(score: number): string {
  return new Intl.NumberFormat('fr-FR').format(score)
}

/**
 * Formats a score in compact notation.
 * 1234567 → "1,2M"
 */
export function formatScoreCompact(score: number): string {
  return new Intl.NumberFormat('fr-FR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(score)
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}

export function formatRating(score: number): string {
  return score.toFixed(1)
}

// ─── Week / date utilities ───────────────────────────────────────────────────

/**
 * Returns the Monday (start) of the ISO week containing the given date.
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0 = Sunday, 1 = Monday …
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

/**
 * Returns the Saturday (end) of the VS week containing the given date.
 * VS weeks run Monday → Saturday (6 days).
 */
export function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date)
  const end = new Date(start)
  end.setDate(start.getDate() + 5) // Monday + 5 days = Saturday
  end.setHours(23, 59, 59, 999)
  return end
}

/**
 * Returns the ISO week number (1–53) for a given date.
 */
export function getIsoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
}

/**
 * Generates a human-readable label for a VS week.
 * "Semaine 14 · 2025"
 */
export function formatWeekLabel(startDate: Date): string {
  const week = getIsoWeekNumber(startDate)
  return `Semaine ${week} · ${startDate.getFullYear()}`
}

/**
 * Returns the previous Monday relative to a given week start.
 */
export function getPreviousWeekStart(weekStart: Date): Date {
  const prev = new Date(weekStart)
  prev.setDate(prev.getDate() - 7)
  return prev
}

/**
 * Asserts that a date is a Monday (valid VS week start).
 */
export function isMonday(date: Date): boolean {
  return date.getDay() === 1
}

// ─── Day labels ──────────────────────────────────────────────────────────────

export const DAY_LABELS: Record<DayOfWeek, string> = {
  1: 'Lundi',
  2: 'Mardi',
  3: 'Mercredi',
  4: 'Jeudi',
  5: 'Vendredi',
  6: 'Samedi',
}

export const DAY_LABELS_SHORT: Record<DayOfWeek, string> = {
  1: 'Lun',
  2: 'Mar',
  3: 'Mer',
  4: 'Jeu',
  5: 'Ven',
  6: 'Sam',
}

// ─── BIGINT safety ───────────────────────────────────────────────────────────

/**
 * Converts a BIGINT string returned by the postgres client to a safe JS number.
 * Throws if the value exceeds Number.MAX_SAFE_INTEGER.
 *
 * Call this in repositories when mapping BIGINT columns.
 */
export function bigintToNumber(value: string, fieldName: string): number {
  const n = Number(value)
  if (!Number.isSafeInteger(n)) {
    throw new UnprocessableError(
      `Field "${fieldName}" value exceeds safe integer range. ` +
      `Contact an administrator.`,
    )
  }
  return n
}

// ─── Generic helpers ─────────────────────────────────────────────────────────

/**
 * Clamps a number between min and max (inclusive).
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Returns the arithmetic mean of an array of numbers.
 * Returns 0 for empty arrays.
 */
export function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

/**
 * Returns the population standard deviation of an array of numbers.
 * Returns 0 for arrays of length < 2.
 */
export function stddev(values: number[]): number {
  if (values.length < 2) return 0
  const avg = mean(values)
  const squaredDiffs = values.map(v => (v - avg) ** 2)
  return Math.sqrt(mean(squaredDiffs))
}

/**
 * Normalizes a value within [min, max] to a 0–1 range.
 * Returns 0 if min === max (avoid division by zero).
 */
export function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0
  return clamp((value - min) / (max - min), 0, 1)
}
