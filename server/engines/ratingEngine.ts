/**
 * Rating Engine — pure computation, no DB access.
 *
 * Produces a global player score out of 100, composed of weighted components.
 * Each component is stored separately for full auditability.
 *
 * ─── Formula (V2) ────────────────────────────────────────────────────────────
 *
 *   weightedSum = vsScore        × weight_vs_score
 *               + regularity     × weight_regularity
 *               + participation  × weight_participation
 *               + eventScore     × weight_event_score       (0 if no data)
 *               + profScore      × weight_profession_score  (0 if no data)
 *
 *   activeWeight = sum of weights whose corresponding data was provided
 *                  (always ≥ the three core weights — they're always active)
 *
 *   rawScore   = (weightedSum / activeWeight) × 100
 *   finalScore = clamp(rawScore + bonusMalus, 0, 100)
 *
 * ─── V1 compatibility ────────────────────────────────────────────────────────
 *
 * eventScores and professionLevels are optional. If absent, their weights
 * do not contribute (even if non-zero in the DB), keeping final scores
 * comparable to V1 until data is available.
 *
 * ─── Components (each normalized 0–1) ────────────────────────────────────────
 *
 *   vsScore      = effectiveTotal / maxEffectiveTotal
 *                  effectiveTotal = Σ(score × [ecoMultiplier if eco, else 1])
 *
 *   regularity   = 1 − (stddev(playedDays) / maxDailyScore)
 *                  Only played days (score > 0) are considered.
 *                  Single day played → regularity = 1.
 *
 *   participation = daysPlayed / 6
 *
 *   eventScore   = playerEventTotal / maxEventTotal (across all players)
 *                  If no events for the week → 0 for everyone.
 *
 *   profScore    = level / MAX_PROFESSION_LEVEL (absolute scale, no cross-player norm)
 *                  If no profession for the player → 0.
 *
 * ─── Design notes ────────────────────────────────────────────────────────────
 *
 * Weights are stored in DB (rating_rules) — no code change needed to adjust.
 * When activating a new module, admin sets its weight > 0 and reduces others.
 * bonusMalus is in final-score points (e.g. +5 = add 5 points post-normalization).
 */

import type { PlayerKpi } from '@/types/api'
import type { PlayerRating, RatingRules } from '@/types/domain'
import { normalize, stddev, clamp } from '@/lib/utils'

// ─── Constants ────────────────────────────────────────────────────────────────

/** Absolute max profession level — change here if the game extends levels */
export const MAX_PROFESSION_LEVEL = 100

// ─── Public interface ─────────────────────────────────────────────────────────

/** Computed rating ready to be persisted by the rating repository */
export type ComputedRating = Omit<PlayerRating, 'id' | 'computedAt'>

export interface RatingEngineInput {
  kpis: PlayerKpi[]
  rules: RatingRules
  ratingRunId: number

  // V2 — all optional; absent = graceful degradation to 0
  /** Map<playerId, totalRawEventScore> — pre-aggregated for the week */
  eventScores?: Map<number, number>
  /** Map<playerId, level> — current profession level */
  professionLevels?: Map<number, number>
  /** Map<playerId, bonusMalusPoints> — manual admin adjustments */
  bonusMalus?: Map<number, number>
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export function computeRatings(input: RatingEngineInput): ComputedRating[] {
  const { kpis, rules, ratingRunId, eventScores, professionLevels, bonusMalus } = input

  if (kpis.length === 0) return []

  const weekStats = computeWeekStats(kpis, rules, eventScores)

  const withScores = kpis.map((kpi) =>
    computePlayerRating(kpi, ratingRunId, rules, weekStats, {
      eventScore:      eventScores?.get(kpi.playerId) ?? null,
      professionLevel: professionLevels?.get(kpi.playerId) ?? null,
      bonusMalus:      bonusMalus?.get(kpi.playerId) ?? 0,
    }),
  )

  return assignRanks(withScores)
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

interface WeekStats {
  maxEffectiveTotal: number
  maxDailyScore: number
  maxEventScore: number   // 0 if no events provided
  hasEventData: boolean
  hasProfessionData: boolean
}

interface PlayerOverrides {
  eventScore: number | null
  professionLevel: number | null
  bonusMalus: number
}

function computeWeekStats(
  kpis: PlayerKpi[],
  rules: RatingRules,
  eventScores?: Map<number, number>,
): WeekStats {
  let maxEffectiveTotal = 1
  let maxDailyScore     = 1
  let maxEventScore     = 0

  for (const kpi of kpis) {
    const effectiveTotal = kpi.dailyScores.reduce((sum, d) => {
      return sum + (d.isEco ? d.score * rules.ecoScoreMultiplier : d.score)
    }, 0)
    if (effectiveTotal > maxEffectiveTotal) maxEffectiveTotal = effectiveTotal

    for (const d of kpi.dailyScores) {
      if (d.score > maxDailyScore) maxDailyScore = d.score
    }
  }

  if (eventScores && eventScores.size > 0) {
    for (const score of eventScores.values()) {
      if (score > maxEventScore) maxEventScore = score
    }
  }

  return {
    maxEffectiveTotal,
    maxDailyScore,
    maxEventScore: Math.max(maxEventScore, 1), // floor at 1 to avoid division by 0
    hasEventData:      eventScores !== undefined,
    hasProfessionData: false, // profession data is player-specific, no week-level stat needed
  }
}

function computePlayerRating(
  kpi: PlayerKpi,
  ratingRunId: number,
  rules: RatingRules,
  week: WeekStats,
  overrides: PlayerOverrides,
): ComputedRating {
  // ── VS Score (0–1) ─────────────────────────────────────────────────────────
  const effectiveTotal = kpi.dailyScores.reduce((sum, d) => {
    return sum + (d.isEco ? d.score * rules.ecoScoreMultiplier : d.score)
  }, 0)
  const rawVsScore = normalize(effectiveTotal, 0, week.maxEffectiveTotal)

  // ── Regularity (0–1) ───────────────────────────────────────────────────────
  const playedScores = kpi.dailyScores.filter((d) => d.score > 0).map((d) => d.score)

  let regularity = 0
  if (playedScores.length >= 2) {
    const sd = stddev(playedScores)
    regularity = clamp(1 - sd / week.maxDailyScore, 0, 1)
  } else if (playedScores.length === 1) {
    regularity = 1
  }

  // ── Participation (0–1) ────────────────────────────────────────────────────
  const participation = kpi.participationRate

  // ── Event Score (0–1) ──────────────────────────────────────────────────────
  // null → module not active (data not passed in)
  // 0   → module active but player has no event score this week
  let eventScoreNorm: number | null = null
  if (week.hasEventData) {
    const raw = overrides.eventScore ?? 0
    eventScoreNorm = normalize(raw, 0, week.maxEventScore)
  }

  // ── Profession Score (0–1) ────────────────────────────────────────────────
  // null → no profession set for this player
  let professionScoreNorm: number | null = null
  if (overrides.professionLevel !== null) {
    professionScoreNorm = clamp(overrides.professionLevel / MAX_PROFESSION_LEVEL, 0, 1)
  } else if (rules.weightProfessionScore > 0) {
    // Weight is active but player has no profession → treat as 0
    professionScoreNorm = 0
  }

  // ── Weighted sum ───────────────────────────────────────────────────────────
  // Only include a module in activeWeight when its data is provided OR weight>0.
  // This preserves V1 behavior when event/profession data is absent.
  const includeEvents      = week.hasEventData || rules.weightEventScore > 0
  const includeProfessions = overrides.professionLevel !== null || rules.weightProfessionScore > 0

  const activeWeight =
    rules.weightVsScore +
    rules.weightRegularity +
    rules.weightParticipation +
    (includeEvents      ? rules.weightEventScore      : 0) +
    (includeProfessions ? rules.weightProfessionScore : 0)

  const weightedSum =
    rawVsScore    * rules.weightVsScore +
    regularity    * rules.weightRegularity +
    participation * rules.weightParticipation +
    (includeEvents      ? (eventScoreNorm      ?? 0) * rules.weightEventScore      : 0) +
    (includeProfessions ? (professionScoreNorm ?? 0) * rules.weightProfessionScore : 0)

  const rawScore = activeWeight > 0 ? (weightedSum / activeWeight) * 100 : 0
  const finalScore = clamp(rawScore + overrides.bonusMalus, 0, 100)

  return {
    playerId:        kpi.playerId,
    ratingRunId,
    rawVsScore:      round4(rawVsScore),
    regularity:      round4(regularity),
    participation:   round4(participation),
    eventScore:      eventScoreNorm !== null ? round4(eventScoreNorm) : null,
    professionScore: professionScoreNorm !== null ? round4(professionScoreNorm) : null,
    bonusMalus:      overrides.bonusMalus,
    finalScore:      round4(finalScore),
    rank:            0, // assigned by assignRanks
  }
}

/**
 * Assigns dense ranks by finalScore descending.
 * Ties share the same rank.
 */
function assignRanks(ratings: ComputedRating[]): ComputedRating[] {
  const sorted = [...ratings].sort((a, b) => {
    const fa = a.finalScore ?? -1
    const fb = b.finalScore ?? -1
    return fb - fa
  })

  let rank = 1
  return sorted.map((r, index) => {
    if (index > 0) {
      const prev = sorted[index - 1]!.finalScore ?? -1
      const curr = r.finalScore ?? -1
      if (curr !== prev) rank = index + 1
    }
    return { ...r, rank }
  })
}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000
}
