/**
 * Eco Day Detector — pure computation, no DB access.
 *
 * A "jour éco" is a day where a player intentionally plays conservatively.
 * Detecting eco days helps distinguish voluntary low scores from absences.
 *
 * V1 default strategy: ABSOLUTE threshold.
 * Rationale: simple, transparent, explainable to players.
 * "If your score is below X million, the day is marked éco."
 *
 * Three strategies are implemented but only 'absolute' is active by default.
 * The strategy is driven by EcoConfig (config/eco.config.ts) — no code change needed
 * to switch methods.
 *
 * To evolve later:
 * - Switch to 'percentile' once we have enough historical data
 * - 'stddev' is more adaptive but harder to explain to players
 */

import type { DailyScore, DayOfWeek } from '@/types/domain'
import type { EcoConfig } from '@/config/eco.config'
import { mean, stddev } from '@/lib/utils'

// ─── Public interface ─────────────────────────────────────────────────────────

export interface EcoEntry {
  playerId: number
  dayOfWeek: DayOfWeek
}

export interface EcoDetectionResult {
  ecoEntries: EcoEntry[]
  /** Threshold actually used (for auditability) */
  appliedThreshold: number
  method: EcoConfig['method']
}

// ─── Entry point ──────────────────────────────────────────────────────────────

/**
 * Detects eco days across all scores for a week.
 *
 * @param scores  All DailyScore records for the week
 * @param config  Eco detection configuration
 * @returns       List of (playerId, dayOfWeek) pairs flagged as eco
 */
export function detectEcoDays(
  scores: DailyScore[],
  config: EcoConfig,
): EcoDetectionResult {
  // Only consider days where the player actually played (score > 0)
  // A score of 0 is an absence, not an eco day
  const playedScores = scores.filter((s) => s.score > 0)

  if (playedScores.length === 0) {
    return { ecoEntries: [], appliedThreshold: 0, method: config.method }
  }

  switch (config.method) {
    case 'absolute':
      return detectAbsolute(playedScores, config.absoluteThreshold)
    case 'percentile':
      return detectPercentile(playedScores, config.percentile)
    case 'stddev':
      return detectStddev(playedScores, config.stddevMultiplier)
  }
}

// ─── Strategy: Absolute ───────────────────────────────────────────────────────

/**
 * Marks as eco any day where score < threshold.
 *
 * Threshold is set in config/eco.config.ts and should reflect
 * the alliance's typical "minimum serious effort" score.
 *
 * Example: threshold = 10_000_000 → days below 10M are eco.
 */
function detectAbsolute(
  scores: DailyScore[],
  threshold: number,
): EcoDetectionResult {
  const ecoEntries = scores
    .filter((s) => s.score < threshold)
    .map((s) => ({ playerId: s.playerId, dayOfWeek: s.dayOfWeek }))

  return { ecoEntries, appliedThreshold: threshold, method: 'absolute' }
}

// ─── Strategy: Percentile ─────────────────────────────────────────────────────

/**
 * Marks as eco the bottom X% of scores across all played days in the week.
 *
 * More adaptive than absolute, but threshold shifts with the week's scores.
 * Good when the alliance's scoring range varies a lot week to week.
 *
 * Example: percentile = 0.2 → bottom 20% of all played scores are eco.
 */
function detectPercentile(
  scores: DailyScore[],
  percentile: number,
): EcoDetectionResult {
  const sorted = [...scores].sort((a, b) => a.score - b.score)
  const cutoffIndex = Math.floor(sorted.length * percentile)
  const threshold = sorted[cutoffIndex]?.score ?? 0

  const ecoEntries = scores
    .filter((s) => s.score <= threshold)
    .map((s) => ({ playerId: s.playerId, dayOfWeek: s.dayOfWeek }))

  return { ecoEntries, appliedThreshold: threshold, method: 'percentile' }
}

// ─── Strategy: Standard deviation ─────────────────────────────────────────────

/**
 * Marks as eco any score below (mean − multiplier × stddev).
 *
 * Most statistically robust, but hardest to explain to players.
 * Better suited once there's enough data to trust the baseline.
 *
 * Example: multiplier = 1.5 → scores more than 1.5σ below the mean are eco.
 */
function detectStddev(
  scores: DailyScore[],
  multiplier: number,
): EcoDetectionResult {
  const values = scores.map((s) => s.score)
  const avg = mean(values)
  const sd = stddev(values)
  const threshold = Math.max(0, avg - multiplier * sd)

  const ecoEntries = scores
    .filter((s) => s.score < threshold)
    .map((s) => ({ playerId: s.playerId, dayOfWeek: s.dayOfWeek }))

  return { ecoEntries, appliedThreshold: threshold, method: 'stddev' }
}
