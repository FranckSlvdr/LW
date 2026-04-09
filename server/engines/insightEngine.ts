/**
 * Insight Engine — pure computation, no DB access, locale-agnostic.
 *
 * Accepts a `messages` section from the dictionary so it can produce
 * translated messages without importing from lib/i18n directly.
 */

import type { PlayerKpi, Insight } from '@/types/api'
import type { Dictionary } from '@/lib/i18n/types'
import { formatScore, formatPercentage } from '@/lib/utils'
import { interpolate, s } from '@/lib/i18n/utils'

type InsightMessages = Dictionary['insights']

// ─── Public interface ─────────────────────────────────────────────────────────

export interface InsightEngineInput {
  currentKpis: PlayerKpi[]
  previousKpis?: PlayerKpi[]
  weekLabel?: string
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export function generateInsights(
  input: InsightEngineInput,
  messages: InsightMessages,
): Insight[] {
  const { currentKpis, previousKpis, weekLabel } = input

  if (currentKpis.length === 0) return []

  const rules: Array<() => Insight | Insight[] | null> = [
    () => topPerformer(currentKpis, messages),
    () => mostImproved(currentKpis, messages),
    () => decliningPlayer(currentKpis, messages),
    () => perfectParticipation(currentKpis, messages),
    () => absentPlayers(currentKpis, messages),
    () => lowParticipation(currentKpis, messages),
    () => ecoDayPattern(currentKpis, messages),
    () => weekOverWeekImprovement(currentKpis, messages, previousKpis, weekLabel),
  ]

  const insights: Insight[] = []
  for (const rule of rules) {
    const result = rule()
    if (!result) continue
    if (Array.isArray(result)) {
      insights.push(...result)
    } else {
      insights.push(result)
    }
  }

  return insights
}

// ─── Rules ────────────────────────────────────────────────────────────────────

function topPerformer(kpis: PlayerKpi[], m: InsightMessages): Insight | null {
  const top = kpis[0]
  if (!top || top.totalScore === 0) return null

  const trend =
    top.rankTrend === 'up'     ? m.topPerformerUp
    : top.rankTrend === 'stable' ? m.topPerformerStable
    : ''

  return {
    id: 'top_performer',
    type: 'top_performer',
    severity: 'success',
    message: interpolate(m.topPerformer, {
      player: top.playerName,
      score: formatScore(top.totalScore),
      trend,
    }),
    affectedPlayerIds: [top.playerId],
  }
}

function mostImproved(kpis: PlayerKpi[], m: InsightMessages): Insight | null {
  const candidates = kpis.filter(
    (k) => k.previousRank !== null && k.rankTrend === 'up',
  )
  if (candidates.length === 0) return null

  const best = candidates.reduce((prev, curr) => {
    const prevGain = (prev.previousRank ?? 0) - prev.rank
    const currGain = (curr.previousRank ?? 0) - curr.rank
    return currGain > prevGain ? curr : prev
  })

  const gain = (best.previousRank ?? 0) - best.rank
  if (gain < 2) return null

  return {
    id: 'most_improved',
    type: 'improving_player',
    severity: 'success',
    message: interpolate(m.mostImproved, {
      player: best.playerName,
      gain,
      s: s(gain),
      prevRank: best.previousRank ?? 0,
      rank: best.rank,
    }),
    affectedPlayerIds: [best.playerId],
  }
}

function decliningPlayer(kpis: PlayerKpi[], m: InsightMessages): Insight | null {
  const DROP_THRESHOLD = 3

  const candidates = kpis.filter(
    (k) => k.previousRank !== null && k.rankTrend === 'down',
  )
  if (candidates.length === 0) return null

  const worst = candidates.reduce((prev, curr) => {
    const prevDrop = prev.rank - (prev.previousRank ?? 0)
    const currDrop = curr.rank - (curr.previousRank ?? 0)
    return currDrop > prevDrop ? curr : prev
  })

  const drop = worst.rank - (worst.previousRank ?? 0)
  if (drop < DROP_THRESHOLD) return null

  return {
    id: 'declining_player',
    type: 'declining_player',
    severity: 'warning',
    message: interpolate(m.decliningPlayer, {
      player: worst.playerName,
      drop,
      s: s(drop),
      prevRank: worst.previousRank ?? 0,
      rank: worst.rank,
    }),
    affectedPlayerIds: [worst.playerId],
  }
}

function perfectParticipation(kpis: PlayerKpi[], m: InsightMessages): Insight | null {
  const perfect = kpis.filter((k) => k.daysPlayed === 6)
  if (perfect.length === 0) return null

  const names =
    perfect.length <= 3
      ? perfect.map((k) => k.playerName).join(', ')
      : interpolate(m.manyPlayers, { n: perfect.length })

  return {
    id: 'perfect_participation',
    type: 'perfect_participation',
    severity: 'success',
    message: interpolate(m.perfectParticipation, { names }),
    affectedPlayerIds: perfect.map((k) => k.playerId),
  }
}

function absentPlayers(kpis: PlayerKpi[], m: InsightMessages): Insight | null {
  const absent = kpis.filter((k) => k.daysPlayed === 0)
  if (absent.length === 0) return null

  const names =
    absent.length <= 3
      ? absent.map((k) => k.playerName).join(', ')
      : interpolate(m.manyPlayers, { n: absent.length })

  return {
    id: 'absent_players',
    type: 'absent_player',
    severity: 'alert',
    message: interpolate(m.absentPlayers, { names }),
    affectedPlayerIds: absent.map((k) => k.playerId),
  }
}

function lowParticipation(kpis: PlayerKpi[], m: InsightMessages): Insight | null {
  const LOW_THRESHOLD = 2
  const low = kpis.filter(
    (k) => k.daysPlayed > 0 && k.daysPlayed <= LOW_THRESHOLD,
  )
  if (low.length === 0) return null

  return {
    id: 'low_participation',
    type: 'absent_player',
    severity: 'warning',
    message: interpolate(m.lowParticipation, {
      count: low.length,
      s: s(low.length),
      threshold: LOW_THRESHOLD,
    }),
    affectedPlayerIds: low.map((k) => k.playerId),
  }
}

function ecoDayPattern(kpis: PlayerKpi[], m: InsightMessages): Insight | null {
  const ECO_THRESHOLD = 3
  const heavy = kpis.filter((k) => k.ecoDays >= ECO_THRESHOLD)
  if (heavy.length === 0) return null

  const names =
    heavy.length <= 2
      ? heavy
          .map((k) => `${k.playerName}${interpolate(m.ecoSuffix, { days: k.ecoDays })}`)
          .join(', ')
      : interpolate(m.manyPlayers, { n: heavy.length })

  return {
    id: 'eco_day_pattern',
    type: 'eco_day_pattern',
    severity: 'info',
    message: interpolate(m.ecoDayPattern, { names }),
    affectedPlayerIds: heavy.map((k) => k.playerId),
  }
}

function weekOverWeekImprovement(
  current: PlayerKpi[],
  m: InsightMessages,
  previous?: PlayerKpi[],
  weekLabel?: string,
): Insight | null {
  if (!previous || previous.length === 0) return null

  const currentTotal  = current.reduce((sum, k) => sum + k.totalScore, 0)
  const previousTotal = previous.reduce((sum, k) => sum + k.totalScore, 0)

  if (previousTotal === 0) return null

  const delta = currentTotal - previousTotal
  const pct   = delta / previousTotal

  if (Math.abs(pct) < 0.03) return null

  const weekLabelStr = weekLabel ? m.weekLabelPrefix + weekLabel : ''

  if (delta > 0) {
    return {
      id: 'week_improvement',
      type: 'week_over_week_improvement',
      severity: 'success',
      message: interpolate(m.weekImprovement, {
        pct: formatPercentage(pct),
        weekLabel: weekLabelStr,
        delta: formatScore(delta),
      }),
    }
  }

  return {
    id: 'week_decline',
    type: 'week_over_week_improvement',
    severity: 'warning',
    message: interpolate(m.weekDecline, {
      pct: formatPercentage(Math.abs(pct)),
      weekLabel: weekLabelStr,
      delta: formatScore(Math.abs(delta)),
    }),
  }
}
