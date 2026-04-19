import 'server-only'
import { unstable_cache, revalidateTag } from 'next/cache'
import { IS_VERCEL_RUNTIME } from '@/server/config/runtime'
import { db } from '@/server/db/client'
import { findStatsCache, saveStatsCache } from '@/server/repositories/statsCacheRepository'
import { logger } from '@/lib/logger'
import type { WeekMemberStatsRow } from '@/types/db'
import type {
  AllianceKpiStats,
  AlliancePlayerEntry,
  AllianceWeekEntry,
} from '@/types/api'

const CACHE_KEY = 'alliance-kpi-v1'

// ─── Computation ──────────────────────────────────────────────────────────────

/**
 * Computes cross-week alliance KPI stats from the last 4 weeks.
 *
 * Data sources:
 *   - week_member_stats  (precomputed per-player VS scores — no heavy computation)
 *   - desert_storm_registrations  (per-week DS registration rows)
 *   - players  (active filter)
 *
 * Total: 3 DB queries run in parallel after resolving week IDs.
 * Expected runtime: ~30–80ms on Supabase free tier (warm connection).
 */
export async function computeAllianceStats(): Promise<AllianceKpiStats> {
  // ── Step 1: resolve last 4 weeks ─────────────────────────────────────────
  const weeks = await db<Array<{ id: number; label: string }>>`
    SELECT id, label FROM weeks ORDER BY start_date DESC LIMIT 4
  `

  if (weeks.length === 0) {
    return emptyStats()
  }

  const weekIds = weeks.map((w) => w.id)

  // ── Step 2: parallel data fetch ──────────────────────────────────────────
  const [memberRows, dsRows] = await Promise.all([
    // All member stats for these weeks, with active-player flag joined in
    db<Array<WeekMemberStatsRow & { is_active: boolean }>>`
      SELECT wms.*, p.is_active
      FROM   week_member_stats wms
      JOIN   players p ON p.id = wms.player_id
      WHERE  wms.week_id = ANY(${weekIds})
    `,

    // DS registration count per active player (0 if never registered)
    db<Array<{
      player_id: number
      player_name: string
      player_alias: string | null
      ds_count: number
    }>>`
      SELECT
        p.id   AS player_id,
        p.name AS player_name,
        p.alias AS player_alias,
        COUNT(dsr.week_id)::int AS ds_count
      FROM   players p
      LEFT JOIN desert_storm_registrations dsr
             ON dsr.player_id = p.id
             AND dsr.week_id  = ANY(${weekIds})
      WHERE  p.is_active = TRUE
      GROUP  BY p.id, p.name, p.alias
      ORDER  BY ds_count ASC
    `,
  ])

  // ── Step 3: per-player aggregation (active players only) ─────────────────

  interface PlayerAgg {
    playerId: number
    playerName: string
    playerAlias: string | null
    totalScore: number
    daysPlayed: number
    weeksPresent: number
  }

  const activeMap = new Map<number, PlayerAgg>()

  for (const row of memberRows) {
    if (!row.is_active) continue
    const score = Number(row.total_score)
    const days  = Number(row.days_played)
    const existing = activeMap.get(row.player_id)
    if (existing) {
      existing.totalScore  += score
      existing.daysPlayed  += days
      existing.weeksPresent++
    } else {
      activeMap.set(row.player_id, {
        playerId:    row.player_id,
        playerName:  row.player_name,
        playerAlias: row.player_alias,
        totalScore:  score,
        daysPlayed:  days,
        weeksPresent: 1,
      })
    }
  }

  const activePlayers = [...activeMap.values()]

  // ── Top / Flop VS ─────────────────────────────────────────────────────────

  const playedSorted = activePlayers
    .filter((p) => p.daysPlayed > 0)
    .sort((a, b) => b.totalScore - a.totalScore)

  const topVS: AlliancePlayerEntry[] = playedSorted.slice(0, 3).map((p) => ({
    playerId:    p.playerId,
    playerName:  p.playerName,
    playerAlias: p.playerAlias,
    value: p.totalScore,
    extra: p.daysPlayed,
  }))

  const flopVS: AlliancePlayerEntry[] = playedSorted
    .slice(-Math.min(3, playedSorted.length))
    .reverse()
    // Ensure no overlap with top 3 (can happen with very few players)
    .filter((p) => !topVS.find((t) => t.playerId === p.playerId))
    .slice(0, 3)
    .map((p) => ({
      playerId:    p.playerId,
      playerName:  p.playerName,
      playerAlias: p.playerAlias,
      value: p.totalScore,
      extra: p.daysPlayed,
    }))

  // ── Most absent ───────────────────────────────────────────────────────────

  const mostAbsent: AlliancePlayerEntry[] = [...activePlayers]
    .sort((a, b) => a.daysPlayed - b.daysPlayed)
    .slice(0, 3)
    .map((p) => ({
      playerId:    p.playerId,
      playerName:  p.playerName,
      playerAlias: p.playerAlias,
      value: p.daysPlayed,
      extra: p.weeksPresent * 6,  // max possible days
    }))

  // ── Least registered DS ───────────────────────────────────────────────────

  const leastDS: AlliancePlayerEntry[] = dsRows.slice(0, 3).map((r) => ({
    playerId:    r.player_id,
    playerName:  r.player_name,
    playerAlias: r.player_alias,
    value: r.ds_count,
    extra: weeks.length,
  }))

  // ── Perfect attendance ────────────────────────────────────────────────────

  const perfectAttendance: AlliancePlayerEntry[] = activePlayers
    .filter((p) => p.weeksPresent > 0 && p.daysPlayed === p.weeksPresent * 6)
    .map((p) => ({
      playerId:    p.playerId,
      playerName:  p.playerName,
      playerAlias: p.playerAlias,
      value: p.weeksPresent,
      extra: weeks.length,
    }))

  // ── Weekly totals (oldest → newest for trend display) ─────────────────────

  const weeklyTotals: AllianceWeekEntry[] = [...weeks].reverse().map((w) => {
    const weekRows   = memberRows.filter((r) => r.week_id === w.id)
    const totalScore = weekRows.reduce((s, r) => s + Number(r.total_score), 0)
    const activeRows = weekRows.filter((r) => r.days_played > 0)
    const avgScore   = activeRows.length > 0
      ? Math.round(totalScore / activeRows.length)
      : 0
    return {
      weekLabel:     w.label,
      totalScore,
      activePlayers: activeRows.length,
      avgScore,
    }
  })

  // ── Alliance-level aggregates ─────────────────────────────────────────────

  const totalParticipation = memberRows
    .filter((r) => r.is_active)
    .reduce((s, r) => s + Number(r.participation_rate), 0)

  const activeMemberRows = memberRows.filter((r) => r.is_active)
  const avgParticipation4w = activeMemberRows.length > 0
    ? totalParticipation / activeMemberRows.length
    : 0

  const totalScore4w = activePlayers.reduce((s, p) => s + p.totalScore, 0)

  const activePlayerWeeks = activeMemberRows.filter((r) => r.days_played > 0).length
  const globalAvgScore4w  = activePlayerWeeks > 0
    ? Math.round(totalScore4w / activePlayerWeeks)
    : 0

  return {
    computedAt:       new Date().toISOString(),
    weeksConsidered:  weeks.length,
    weekLabels:       [...weeks].reverse().map((w) => w.label),
    topVS,
    flopVS,
    mostAbsent,
    leastDS,
    perfectAttendance,
    weeklyTotals,
    avgParticipation4w,
    globalAvgScore4w,
    totalScore4w,
  }
}

function emptyStats(): AllianceKpiStats {
  return {
    computedAt:       new Date().toISOString(),
    weeksConsidered:  0,
    weekLabels:       [],
    topVS:            [],
    flopVS:           [],
    mostAbsent:       [],
    leastDS:          [],
    perfectAttendance:[],
    weeklyTotals:     [],
    avgParticipation4w: 0,
    globalAvgScore4w:   0,
    totalScore4w:       0,
  }
}

// ─── Cached read ──────────────────────────────────────────────────────────────

/**
 * Reads alliance stats from the daily-computed cache.
 * Falls back to live computation if the cache is empty (first run only).
 * Uses Next.js Data Cache (1h TTL) as a second layer to avoid DB hits on
 * every page load between cron runs.
 *
 * Cache invalidation: cron calls revalidateTag('alliance-stats') after saving.
 */
const readAllianceStatsCached = unstable_cache(
  async (): Promise<AllianceKpiStats> => {
    const cached = await findStatsCache(CACHE_KEY)
    if (cached) return cached as AllianceKpiStats

    // First run — no cron has executed yet; compute live and persist.
    logger.info('allianceStats: cache miss, computing live (first run)')
    const stats = await computeAllianceStats()
    await saveStatsCache(CACHE_KEY, stats)
    return stats
  },
  [CACHE_KEY],
  { revalidate: 3600, tags: ['alliance-stats'] },
)

export async function getAllianceStats(): Promise<AllianceKpiStats> {
  if (IS_VERCEL_RUNTIME) {
    return readAllianceStatsCached()
  }
  // Local dev: skip Next.js cache, always read fresh
  const cached = await findStatsCache(CACHE_KEY)
  if (cached) return cached as AllianceKpiStats
  const stats = await computeAllianceStats()
  await saveStatsCache(CACHE_KEY, stats)
  return stats
}

// ─── Cron entry point ─────────────────────────────────────────────────────────

/**
 * Called by the daily cron job at 04:00 UTC.
 * Computes fresh stats, persists to stats_cache, and busts the Next.js cache.
 */
export async function refreshAllianceStats(): Promise<{ ok: boolean }> {
  const stats = await computeAllianceStats()
  await saveStatsCache(CACHE_KEY, stats)

  try {
    revalidateTag('alliance-stats', 'max')
  } catch {
    // revalidateTag can throw outside full render context — harmless here
  }

  logger.info('allianceStats: refreshed', {
    weeks:   stats.weeksConsidered,
    players: stats.topVS.length + stats.flopVS.length,
  })

  return { ok: true }
}
