import 'server-only'
import { unstable_cache } from 'next/cache'
import { findAllPlayers } from '@/server/repositories/playerRepository'
import { findScoresByWeek } from '@/server/repositories/scoreRepository'
import { findWeekById, findAllWeeks } from '@/server/repositories/weekRepository'
import { findVsDaysByWeekAsMap } from '@/server/repositories/vsDayRepository'
import { findSnapshot, saveSnapshot } from '@/server/repositories/analyticsRepository'
import { computeKpis, getTopPlayers, getFlopPlayers } from '@/server/engines/kpiEngine'
import { generateInsights } from '@/server/engines/insightEngine'
import { NotFoundError } from '@/lib/errors'
import { APP_CONFIG } from '@/config/app.config'
import { getLocale, getDict } from '@/lib/i18n/server'
import { logger } from '@/lib/logger'
import { perf } from '@/lib/perf'
import type { PlayerKpi, WeekKpiSummary, WeekDelta, Insight, DashboardSnapshot, WeekRankStatsApi } from '@/types/api'

// ─── Public return type ───────────────────────────────────────────────────────

export interface DashboardData {
  summary: WeekKpiSummary
  allKpis: PlayerKpi[]
  insights: Insight[]
  /** Per-rank-tier aggregated stats — used by RankDistributionPanel. */
  rankStats: WeekRankStatsApi[]
  /** Pre-computed level distribution — avoids extra getAllPlayers() on dashboard */
  levelBuckets: Array<{ level: number; count: number }>
}

// ─── Pure rank distribution computation ──────────────────────────────────────

/**
 * Computes per-rank-tier aggregated stats from KPIs and player rank map.
 * Pure function — no DB access. O(N) where N = players.
 */
export function computeRankDistribution(
  allKpis: PlayerKpi[],
  playerRanks: Record<number, string | null>,
): WeekRankStatsApi[] {
  const groups = new Map<string, PlayerKpi[]>()

  for (const kpi of allKpis) {
    const tier = playerRanks[kpi.playerId] ?? 'unranked'
    const list = groups.get(tier)
    if (list) list.push(kpi)
    else groups.set(tier, [kpi])
  }

  const rankOrder = ['R5', 'R4', 'R3', 'R2', 'R1', 'unranked']
  const result: WeekRankStatsApi[] = []

  for (const [currentRank, kpis] of groups) {
    const active = kpis.filter((k) => k.daysPlayed > 0)
    const totalScore = kpis.reduce((s, k) => s + k.totalScore, 0)
    const avgScore = active.length > 0 ? Math.round(totalScore / active.length) : 0
    const avgParticipation =
      kpis.length > 0
        ? kpis.reduce((s, k) => s + k.participationRate, 0) / kpis.length
        : 0
    const avgDaysPlayed =
      kpis.length > 0
        ? kpis.reduce((s, k) => s + k.daysPlayed, 0) / kpis.length
        : 0

    result.push({ currentRank, memberCount: kpis.length, activeCount: active.length, totalScore, avgScore, avgParticipation, avgDaysPlayed })
  }

  return result.sort(
    (a, b) => rankOrder.indexOf(a.currentRank) - rankOrder.indexOf(b.currentRank),
  )
}

// ─── Core computation (exported for analyticsService) ────────────────────────

/**
 * Fetches all raw data and computes the locale-agnostic dashboard snapshot.
 * This is the "slow path" — 5–7 DB queries plus pure computation.
 *
 * Exported so analyticsService can call it directly when force-refreshing,
 * bypassing the Next.js cache layer.
 */
export async function computeDashboardCore(weekId: number): Promise<DashboardSnapshot> {
  const done = perf('kpiService.computeDashboardCore')

  const [week, players, currentScores, ecoDays, allWeeks] = await Promise.all([
    findWeekById(weekId),
    findAllPlayers(),
    findScoresByWeek(weekId),
    findVsDaysByWeekAsMap(weekId),
    findAllWeeks(),
  ])
  if (!week) throw new NotFoundError('Week', weekId)

  // Identify previous week
  const sorted = allWeeks
    .filter((w) => w.startDate < week.startDate)
    .sort((a, b) => b.startDate.getTime() - a.startDate.getTime())
  const previousWeek = sorted[0] ?? null

  let previousScores: Awaited<ReturnType<typeof findScoresByWeek>> | undefined
  let previousEcoDays: Awaited<ReturnType<typeof findVsDaysByWeekAsMap>> | undefined

  if (previousWeek) {
    ;[previousScores, previousEcoDays] = await Promise.all([
      findScoresByWeek(previousWeek.id),
      findVsDaysByWeekAsMap(previousWeek.id),
    ])
  }

  const allKpis = computeKpis({
    players,
    currentScores,
    previousScores,
    ecoDays,
    previousEcoDays,
  })

  // ── Compute prevKpis ONCE — reused for delta AND insights (was computed 3× before) ──
  const prevKpis =
    previousWeek && previousScores && previousScores.length > 0
      ? computeKpis({ players, currentScores: previousScores, ecoDays: previousEcoDays })
      : null

  // Alliance-level aggregates
  const topPlayers           = getTopPlayers(allKpis, APP_CONFIG.dashboardTopFlopCount)
  const flopPlayers          = getFlopPlayers(allKpis, APP_CONFIG.dashboardTopFlopCount)
  const globalTotalScore     = allKpis.reduce((s, k) => s + k.totalScore, 0)
  const globalRawTotalScore  = allKpis.reduce((s, k) => s + k.rawTotalScore, 0)
  const activePlayers        = allKpis.filter((k) => k.daysPlayed > 0)
  const globalAverageScore   =
    activePlayers.length > 0
      ? Math.round(globalTotalScore / activePlayers.length)
      : 0

  // N vs N-1 delta (uses prevKpis computed above — no extra computeKpis call)
  let vsLastWeek: WeekDelta | null = null
  if (previousWeek && prevKpis) {
    const prevTotal  = prevKpis.reduce((s, k) => s + k.totalScore, 0)
    const prevActive = prevKpis.filter((k) => k.daysPlayed > 0).length
    vsLastWeek = {
      weekId:                previousWeek.id,
      weekLabel:             previousWeek.label,
      globalTotalScoreDelta: globalTotalScore - prevTotal,
      participationDelta:    activePlayers.length - prevActive,
    }
  }

  const summary: WeekKpiSummary = {
    weekId,
    weekLabel:           week.label,
    totalPlayers:        activePlayers.length,
    globalTotalScore,
    globalRawTotalScore,
    globalAverageScore,
    topPlayers,
    flopPlayers,
    vsLastWeek,
  }

  // Build playerId → rank tier map from the loaded player list
  const playerRanks: Record<number, string | null> = {}
  for (const p of players) {
    playerRanks[p.id] = p.currentRank
  }

  // Pre-compute level buckets — avoids a separate getAllPlayers() call on the dashboard
  const levelMap: Record<number, number> = {}
  for (const p of players) {
    if (p.generalLevel != null) levelMap[p.generalLevel] = (levelMap[p.generalLevel] ?? 0) + 1
  }
  const levelBuckets = Object.entries(levelMap)
    .map(([level, count]) => ({ level: Number(level), count }))
    .sort((a, b) => b.level - a.level)

  done()
  return { summary, allKpis, prevKpis, playerRanks, levelBuckets }
}

// ─── Cached read (snapshot + Next.js cache) ───────────────────────────────────

/**
 * Tries the DB snapshot first, falls back to full computation.
 * Result is then stored in the Next.js Data Cache (shared across instances on
 * Vercel) via unstable_cache, keyed per week with a per-week invalidation tag.
 *
 * Cache hierarchy:
 *  1. Next.js Data Cache (in-memory + Vercel shared)   → ~0ms
 *  2. DB snapshot (week_kpi_snapshots, JSONB)           → ~5ms
 *  3. Full computation (7 DB queries + pure engines)    → ~100–300ms
 */
async function computeOrReadSnapshot(weekId: number): Promise<DashboardSnapshot> {
  // Layer 2: DB snapshot
  const snapshot = await findSnapshot(weekId)
  if (snapshot) return snapshot

  // Layer 3: full computation
  const fresh = await computeDashboardCore(weekId)

  // Persist to DB snapshot so the next cold start skips full computation
  try {
    await saveSnapshot(weekId, fresh)
  } catch (err) {
    logger.error('Failed to save dashboard snapshot', { weekId, err: String(err) })
  }

  return fresh
}

/**
 * Returns an unstable_cache-wrapped reader for a specific week.
 * Creates a unique cache entry and invalidation tag per weekId.
 *
 * Note: creating unstable_cache wrappers dynamically per weekId is
 * intentional — it allows per-week tag invalidation without a shared
 * global cache that would require clearing all weeks together.
 */
function getDashboardCoreForWeek(weekId: number) {
  return unstable_cache(
    () => computeOrReadSnapshot(weekId),
    [`dashboard-core-${weekId}`],
    {
      // Safety TTL of 10 min — primary invalidation is via revalidateTag.
      // Prevents stale data surviving indefinitely if a tag bust fails.
      revalidate: 600,
      tags: [`week-kpi-${weekId}`, 'dashboard'],
    },
  )
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Main entry point for the dashboard.
 * Returns cached data from the 3-tier cache system + locale-aware insights.
 *
 * Insights are NOT stored in the cache (they're locale-dependent) — they are
 * regenerated from the cached KPIs every time (~0.5 ms pure computation).
 */
export async function getDashboardData(weekId: number): Promise<DashboardData> {
  // Fetch cached core (1 of the 3 cache layers above)
  const snapshot = await getDashboardCoreForWeek(weekId)()

  // Generate locale-aware insights from cached data — pure, no DB
  const locale = await getLocale()
  const dict   = await getDict(locale)

  const insights = generateInsights(
    {
      currentKpis:  snapshot.allKpis,
      previousKpis: snapshot.prevKpis ?? undefined,
      weekLabel:    snapshot.summary.weekLabel,
    },
    dict.insights,
  )

  // Compute rank-tier distribution from cached data — pure, no DB
  const rankStats = computeRankDistribution(snapshot.allKpis, snapshot.playerRanks)

  return {
    summary:      snapshot.summary,
    allKpis:      snapshot.allKpis,
    insights,
    rankStats,
    levelBuckets: snapshot.levelBuckets ?? [],
  }
}

/**
 * Lightweight version — returns just the summary without full KPI list.
 * Used by the KPI API route.
 */
export async function getWeekSummary(weekId: number): Promise<WeekKpiSummary> {
  const { summary } = await getDashboardData(weekId)
  return summary
}
