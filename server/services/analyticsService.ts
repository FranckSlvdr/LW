import 'server-only'
import { revalidateTag } from 'next/cache'
import {
  markSnapshotStale,
  markAllSnapshotsStale,
  saveSnapshot,
  saveWeekMemberStats,
  saveWeekRankStats,
  findStaleSnapshotWeekIds,
  findWeekRankStats,
} from '@/server/repositories/analyticsRepository'
import { computeDashboardCore, computeRankDistribution } from '@/server/services/kpiService'
import { logger } from '@/lib/logger'
import { perf } from '@/lib/perf'
import type { WeekRankStatsApi } from '@/types/api'

// ─── Cache invalidation ───────────────────────────────────────────────────────

/**
 * Invalidates the dashboard cache for a specific week.
 *
 * Called after:
 * - Score import for that week
 * - Manual score entry / eco-day toggle for that week
 *
 * Effect:
 * - Next.js Data Cache entry for that week is busted (revalidateTag)
 * - DB snapshot is marked stale → next read triggers recomputation
 */
export function invalidateWeekKpi(weekId: number): void {
  try {
    revalidateTag(`week-kpi-${weekId}`, 'max')
  } catch {
    // revalidateTag can throw outside full request context; TTL handles expiry
  }

  // Mark snapshot stale — the 3-tier cache will recompute on the next page load.
  // Do NOT eagerly call refreshWeekAnalytics() here: it runs 7–10 DB queries in
  // the background, saturates the connection pool, and causes 30s timeouts on
  // concurrent page loads.
  markSnapshotStale(weekId).catch((err) => {
    logger.warn('Failed to mark snapshot stale', { weekId, err: String(err) })
  })
}

/**
 * Invalidates ALL week snapshots.
 *
 * Called after:
 * - Player roster import (affects every week's KPI since player data is embedded)
 * - Player name / rank changes
 */
export function invalidateAllKpis(): void {
  try {
    revalidateTag('dashboard', 'max')
  } catch {
    // Same as above
  }
  markAllSnapshotsStale().catch((err) => {
    logger.warn('Failed to mark all snapshots stale', { err: String(err) })
  })
}

// ─── Analytics refresh ────────────────────────────────────────────────────────

/**
 * Force-recomputes and persists all analytics for a given week.
 *
 * Writes to:
 *  - week_kpi_snapshots   (dashboard fast-path cache)
 *  - week_member_stats    (structured per-player data for analytics queries)
 *  - week_rank_stats      (per-rank-tier aggregates)
 *
 * Then busts the Next.js Data Cache so the next request reads the new snapshot.
 *
 * Idempotent — safe to call multiple times.
 */
export async function refreshWeekAnalytics(weekId: number): Promise<void> {
  const done = perf(`analyticsService.refreshWeekAnalytics(${weekId})`)
  logger.info('Analytics refresh started', { weekId })

  const snapshot = await computeDashboardCore(weekId)
  const rankStats = computeRankDistribution(snapshot.allKpis, snapshot.playerRanks)

  // Persist all three tables in parallel
  await Promise.all([
    saveSnapshot(weekId, snapshot),
    saveWeekMemberStats(weekId, snapshot.allKpis, snapshot.playerRanks),
    saveWeekRankStats(weekId, rankStats),
  ])

  // Bust the Next.js Data Cache so the next request picks up the new snapshot
  try {
    revalidateTag(`week-kpi-${weekId}`, 'max')
  } catch {
    // Fine — cache will serve the new snapshot on next cold hit
  }

  done()
  logger.info('Analytics refresh completed', {
    weekId,
    players: snapshot.allKpis.length,
    rankTiers: rankStats.length,
  })
}

/**
 * Refreshes all weeks whose snapshot is currently marked stale.
 * Intended for the cron job — processes stale weeks sequentially
 * to avoid overwhelming the DB connection pool.
 */
export async function refreshStaleSnapshots(): Promise<{ refreshed: number; failed: number }> {
  const weekIds = await findStaleSnapshotWeekIds()
  logger.info('Cron: refreshing stale snapshots', { count: weekIds.length, weekIds })

  let refreshed = 0
  let failed    = 0

  for (const weekId of weekIds) {
    try {
      await refreshWeekAnalytics(weekId)
      refreshed++
    } catch (err) {
      failed++
      logger.error('Cron: failed to refresh snapshot', { weekId, err: String(err) })
    }
  }

  return { refreshed, failed }
}

/**
 * Refreshes only the most recent stale snapshot.
 *
 * Used after roster mutations so the latest visible dashboard/vs pages become
 * fresh quickly, while older stale weeks can be handled later by cron.
 */
export async function refreshLatestStaleSnapshot(): Promise<number | null> {
  const weekIds = await findStaleSnapshotWeekIds()
  const latestWeekId = weekIds[0] ?? null

  if (!latestWeekId) {
    logger.info('No stale snapshot to refresh after roster mutation')
    return null
  }

  await refreshWeekAnalytics(latestWeekId)
  return latestWeekId
}

// ─── Analytics reads ──────────────────────────────────────────────────────────

/**
 * Returns rank-tier stats for a week from the precomputed table.
 * Falls back to an empty array if no data is available yet
 * (use computeRankDistribution with cached KPIs for the live dashboard instead).
 */
export async function getWeekRankStats(weekId: number): Promise<WeekRankStatsApi[]> {
  return findWeekRankStats(weekId)
}
