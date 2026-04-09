/**
 * KPI Engine — pure computation, no DB access.
 *
 * Responsibility: transform raw players + daily scores into structured KPIs.
 *
 * Rules (V2 — eco cap):
 * - Eco days are defined at the alliance level (vs_days table), not per-player.
 * - adjusted_score = MIN(raw_score, ECO_SCORE_CAP) when the day is eco.
 * - All aggregations (totalScore, dailyAverage, rank) use adjusted scores.
 * - rawTotalScore is preserved separately for display purposes.
 * - Total score = sum of adjusted daily scores for the week
 * - Days played = count of days where raw score > 0 (eco ≠ absence)
 * - Participation rate = daysPlayed / 6 (VS week = 6 days)
 * - Daily average = totalScore / daysPlayed (0 if no days played)
 * - Rank = position by totalScore descending (ties share the same rank)
 * - Rank trend = compared to previous week's rank if provided
 * - Eco days = count of VS days flagged as eco (alliance-level)
 *
 * V1 note: players with score = 0 on all days are included with rank at bottom.
 */

import type { Player, DailyScore, DayOfWeek } from '@/types/domain'
import type { PlayerKpi, DailyScoreApi } from '@/types/api'

/** Score cap applied to all player scores on eco days */
export const ECO_SCORE_CAP = 7_200_000

// ─── Public interface ─────────────────────────────────────────────────────────

export interface KpiEngineInput {
  players: Player[]
  /** Scores for the current week */
  currentScores: DailyScore[]
  /** Scores for the previous week — enables rank comparison */
  previousScores?: DailyScore[]
  /**
   * Alliance-level eco day flags: Map<dayOfWeek, isEco>.
   * Days missing from the map are treated as non-eco.
   * Applies to the current week only — previous week uses its own eco flags.
   */
  ecoDays?: Map<DayOfWeek, boolean>
  /**
   * Eco day flags for the previous week.
   * Used only for rank trend computation (N vs N-1 comparison must be consistent).
   */
  previousEcoDays?: Map<DayOfWeek, boolean>
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export function computeKpis(input: KpiEngineInput): PlayerKpi[] {
  const { players, currentScores, previousScores, ecoDays, previousEcoDays } = input

  const emptyEcoMap = new Map<DayOfWeek, boolean>()
  const currentEco = ecoDays ?? emptyEcoMap

  const currentMap = groupByPlayer(currentScores)
  const ranked = rankByTotal(
    players.map((p) => buildPlayerKpi(p, currentMap.get(p.id) ?? [], currentEco)),
  )

  if (!previousScores || previousScores.length === 0) {
    return ranked.map((k) => ({ ...k, previousRank: null, rankTrend: null }))
  }

  const prevEco = previousEcoDays ?? emptyEcoMap
  const previousMap = groupByPlayer(previousScores)
  const previousRanked = rankByTotal(
    players.map((p) => buildPlayerKpi(p, previousMap.get(p.id) ?? [], prevEco)),
  )
  const prevRankById = new Map(previousRanked.map((k) => [k.playerId, k.rank]))

  return ranked.map((kpi) => {
    const previousRank = prevRankById.get(kpi.playerId) ?? null
    return {
      ...kpi,
      previousRank,
      rankTrend: computeRankTrend(kpi.rank, previousRank),
    }
  })
}

/**
 * Convenience: returns top N players by total score.
 */
export function getTopPlayers(kpis: PlayerKpi[], count: number): PlayerKpi[] {
  return kpis.slice(0, count)
}

/**
 * Convenience: returns bottom N players by total score.
 * Players with 0 score are ordered by name to be deterministic.
 */
export function getFlopPlayers(kpis: PlayerKpi[], count: number): PlayerKpi[] {
  return [...kpis].reverse().slice(0, count)
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Groups DailyScore[] by playerId into a Map for O(1) lookups */
function groupByPlayer(scores: DailyScore[]): Map<number, DailyScore[]> {
  const map = new Map<number, DailyScore[]>()
  for (const score of scores) {
    const existing = map.get(score.playerId)
    if (existing) {
      existing.push(score)
    } else {
      map.set(score.playerId, [score])
    }
  }
  return map
}

/** Builds a single player's KPI object from their weekly scores */
function buildPlayerKpi(
  player: Player,
  scores: DailyScore[],
  ecoDays: Map<DayOfWeek, boolean>,
): PlayerKpi {
  // Build the 6-day grid — missing days have score 0
  const scoresByDay = new Map(scores.map((s) => [s.dayOfWeek, s]))

  const dailyScores: DailyScoreApi[] = ([1, 2, 3, 4, 5, 6] as DayOfWeek[]).map((day) => {
    const s = scoresByDay.get(day)
    const rawScore = s?.score ?? 0
    const isEco = ecoDays.get(day) ?? false
    const adjustedScore = isEco && rawScore > 0 ? Math.min(rawScore, ECO_SCORE_CAP) : rawScore
    return { dayOfWeek: day, score: rawScore, adjustedScore, isEco }
  })

  const rawTotalScore = dailyScores.reduce((sum, d) => sum + d.score, 0)
  const totalScore = dailyScores.reduce((sum, d) => sum + d.adjustedScore, 0)
  const daysPlayed = dailyScores.filter((d) => d.score > 0).length
  const participationRate = daysPlayed / 6
  const dailyAverage = daysPlayed > 0 ? Math.round(totalScore / daysPlayed) : 0
  const ecoDayCount = ([1, 2, 3, 4, 5, 6] as DayOfWeek[]).filter(
    (day) => ecoDays.get(day) ?? false,
  ).length

  return {
    playerId: player.id,
    playerName: player.name,
    playerAlias: player.alias,
    totalScore,
    rawTotalScore,
    daysPlayed,
    participationRate,
    dailyAverage,
    rank: 0, // assigned by rankByTotal
    previousRank: null,
    rankTrend: null,
    ecoDays: ecoDayCount,
    dailyScores,
  }
}

/**
 * Assigns ranks by totalScore descending.
 * Ties receive the same rank (dense ranking: 1, 2, 2, 3 not 1, 2, 2, 4).
 */
function rankByTotal(kpis: PlayerKpi[]): PlayerKpi[] {
  const sorted = [...kpis].sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore
    return a.playerName.localeCompare(b.playerName) // deterministic tie-break
  })

  let rank = 1
  return sorted.map((kpi, index) => {
    if (index > 0 && sorted[index - 1].totalScore !== kpi.totalScore) {
      rank = index + 1
    }
    return { ...kpi, rank }
  })
}

function computeRankTrend(
  current: number,
  previous: number | null,
): PlayerKpi['rankTrend'] {
  if (previous === null) return null
  if (current < previous) return 'up'
  if (current > previous) return 'down'
  return 'stable'
}
