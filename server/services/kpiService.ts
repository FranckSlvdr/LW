import 'server-only'
import { findAllPlayers } from '@/server/repositories/playerRepository'
import { findScoresByWeek } from '@/server/repositories/scoreRepository'
import { findWeekById, findAllWeeks } from '@/server/repositories/weekRepository'
import { findVsDaysByWeekAsMap } from '@/server/repositories/vsDayRepository'
import { computeKpis, getTopPlayers, getFlopPlayers } from '@/server/engines/kpiEngine'
import { generateInsights } from '@/server/engines/insightEngine'
import { NotFoundError } from '@/lib/errors'
import { APP_CONFIG } from '@/config/app.config'
import { getLocale, getDict } from '@/lib/i18n/server'
import type { PlayerKpi, WeekKpiSummary, WeekDelta, Insight } from '@/types/api'

// ─── Public return type ───────────────────────────────────────────────────────

export interface DashboardData {
  summary: WeekKpiSummary
  allKpis: PlayerKpi[]
  insights: Insight[]
}

// ─── Main orchestrator ────────────────────────────────────────────────────────

/**
 * Fetches all data needed to render the dashboard for a given week.
 * Called directly from the dashboard Server Component (no HTTP round-trip).
 *
 * Orchestration:
 *  1. Load week, players, current + previous scores, eco days (parallel where possible)
 *  2. Run kpiEngine (pure) with alliance-level eco day caps
 *  3. Run insightEngine (pure)
 *  4. Assemble the response
 */
export async function getDashboardData(weekId: number): Promise<DashboardData> {
  const week = await findWeekById(weekId)
  if (!week) throw new NotFoundError('Week', weekId)

  // Load players, current scores, eco days and all weeks in parallel
  const [players, currentScores, ecoDays, allWeeks] = await Promise.all([
    findAllPlayers(),
    findScoresByWeek(weekId),
    findVsDaysByWeekAsMap(weekId),
    findAllWeeks(),
  ])

  // Find the previous week (the one immediately before this one)
  const sorted = allWeeks
    .filter((w) => w.startDate < week.startDate)
    .sort((a, b) => b.startDate.getTime() - a.startDate.getTime())
  const previousWeek = sorted[0] ?? null

  let previousScores: typeof currentScores | undefined
  let previousEcoDays: Awaited<ReturnType<typeof findVsDaysByWeekAsMap>> | undefined

  if (previousWeek) {
    ;[previousScores, previousEcoDays] = await Promise.all([
      findScoresByWeek(previousWeek.id),
      findVsDaysByWeekAsMap(previousWeek.id),
    ])
  }

  // Pure computations — no DB
  const allKpis = computeKpis({
    players,
    currentScores,
    previousScores,
    ecoDays,
    previousEcoDays,
  })

  const topPlayers = getTopPlayers(allKpis, APP_CONFIG.dashboardTopFlopCount)
  const flopPlayers = getFlopPlayers(allKpis, APP_CONFIG.dashboardTopFlopCount)

  const globalTotalScore    = allKpis.reduce((s, k) => s + k.totalScore, 0)
  const globalRawTotalScore = allKpis.reduce((s, k) => s + k.rawTotalScore, 0)
  const activePlayers = allKpis.filter((k) => k.daysPlayed > 0)
  const globalAverageScore =
    activePlayers.length > 0
      ? Math.round(globalTotalScore / activePlayers.length)
      : 0

  // N vs N-1 delta (uses adjusted scores for both weeks)
  let vsLastWeek: WeekDelta | null = null
  if (previousWeek && previousScores) {
    const prevKpis = computeKpis({
      players,
      currentScores: previousScores,
      ecoDays: previousEcoDays,
    })
    const prevTotal = prevKpis.reduce((s, k) => s + k.totalScore, 0)
    const prevActive = prevKpis.filter((k) => k.daysPlayed > 0).length
    vsLastWeek = {
      weekId: previousWeek.id,
      weekLabel: previousWeek.label,
      globalTotalScoreDelta: globalTotalScore - prevTotal,
      participationDelta: activePlayers.length - prevActive,
    }
  }

  const summary: WeekKpiSummary = {
    weekId,
    weekLabel: week.label,
    totalPlayers: activePlayers.length,
    globalTotalScore,
    globalRawTotalScore,
    globalAverageScore,
    topPlayers,
    flopPlayers,
    vsLastWeek,
  }

  const locale = await getLocale()
  const dict   = await getDict(locale)

  const insights = generateInsights(
    {
      currentKpis: allKpis,
      previousKpis: previousScores
        ? computeKpis({ players, currentScores: previousScores, ecoDays: previousEcoDays })
        : undefined,
      weekLabel: week.label,
    },
    dict.insights,
  )

  return { summary, allKpis, insights }
}

/**
 * Lightweight version — used by the KPI API route.
 * Returns the summary without the full allKpis list.
 */
export async function getWeekSummary(weekId: number): Promise<WeekKpiSummary> {
  const { summary } = await getDashboardData(weekId)
  return summary
}
