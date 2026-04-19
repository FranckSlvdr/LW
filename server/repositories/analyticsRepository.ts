import 'server-only'
import { db } from '@/server/db/client'
import { bigintToNumber } from '@/lib/utils'
import type { DashboardSnapshot, WeekRankStatsApi, PlayerKpi } from '@/types/api'
import type { WeekKpiSnapshotRow, WeekMemberStatsRow, WeekRankStatsRow } from '@/types/db'

// ─── Snapshot CRUD ────────────────────────────────────────────────────────────

/**
 * Returns the cached DashboardSnapshot for a week if it exists and is not stale.
 * Returns null on cache miss or when stale.
 */
export async function findSnapshot(weekId: number): Promise<DashboardSnapshot | null> {
  const rows = await db<WeekKpiSnapshotRow[]>`
    SELECT payload, stale FROM week_kpi_snapshots
    WHERE week_id = ${weekId} AND stale = FALSE
    LIMIT 1
  `
  if (!rows[0]) return null
  return rows[0].payload as DashboardSnapshot
}

/**
 * Returns true if the snapshot for a week exists but is marked stale
 * (i.e. an import or edit happened and the recompute is pending).
 * Used to show a "refreshing" indicator on the VS page.
 */
export async function isSnapshotStale(weekId: number): Promise<boolean> {
  const rows = await db<{ stale: boolean }[]>`
    SELECT stale FROM week_kpi_snapshots WHERE week_id = ${weekId} LIMIT 1
  `
  return rows[0]?.stale === true
}

/**
 * Returns the stored DashboardSnapshot for a week even if it is stale.
 * Useful as a fast fallback on hosted runtimes where serving a slightly stale
 * snapshot is better than recomputing analytics during navigation.
 */
export async function findStoredSnapshot(weekId: number): Promise<DashboardSnapshot | null> {
  const rows = await db<WeekKpiSnapshotRow[]>`
    SELECT payload, stale FROM week_kpi_snapshots
    WHERE week_id = ${weekId}
    LIMIT 1
  `
  if (!rows[0]) return null
  return rows[0].payload as DashboardSnapshot
}

/**
 * Upserts the snapshot for a week and clears the stale flag.
 * Called after a successful recompute.
 */
export async function saveSnapshot(
  weekId: number,
  snapshot: DashboardSnapshot,
): Promise<void> {
  // Cast through unknown → JSONValue-compatible path for postgres.js
  const payload = JSON.parse(JSON.stringify(snapshot)) as Parameters<typeof db.json>[0]
  await db`
    INSERT INTO week_kpi_snapshots (week_id, payload, stale, computed_at)
    VALUES (${weekId}, ${db.json(payload)}, FALSE, NOW())
    ON CONFLICT (week_id) DO UPDATE SET
      payload     = EXCLUDED.payload,
      stale       = FALSE,
      computed_at = NOW()
  `
}

/**
 * Marks a week's snapshot as stale without deleting it.
 * The stale snapshot stays readable (for potential fallback) but
 * the next cache read will recompute and replace it.
 */
export async function markSnapshotStale(weekId: number): Promise<void> {
  await db`
    UPDATE week_kpi_snapshots SET stale = TRUE WHERE week_id = ${weekId}
  `
}

/** Marks ALL existing snapshots stale — called when player roster changes. */
export async function markAllSnapshotsStale(): Promise<void> {
  await db`UPDATE week_kpi_snapshots SET stale = TRUE WHERE stale = FALSE`
}

/** Returns weekIds of all snapshots currently marked stale. Used by cron refresher. */
export async function findStaleSnapshotWeekIds(): Promise<number[]> {
  const rows = await db<{ week_id: number }[]>`
    SELECT week_id FROM week_kpi_snapshots
    WHERE stale = TRUE
    ORDER BY week_id DESC
  `
  return rows.map((r) => r.week_id)
}

// ─── Member stats ─────────────────────────────────────────────────────────────

/**
 * Atomically replaces all member stats rows for a week.
 * Idempotent: safe to call multiple times with the same data.
 */
export async function saveWeekMemberStats(
  weekId: number,
  kpis: PlayerKpi[],
  playerRanks: Record<number, string | null>,
): Promise<void> {
  if (kpis.length === 0) return

  const rows = kpis.map((k) => ({
    week_id:            weekId,
    player_id:          k.playerId,
    player_name:        k.playerName,
    player_alias:       k.playerAlias,
    current_rank:       playerRanks[k.playerId] ?? null,
    rank_position:      k.rank,
    previous_rank:      k.previousRank,
    rank_trend:         k.rankTrend,
    total_score:        k.totalScore,
    raw_total_score:    k.rawTotalScore,
    days_played:        k.daysPlayed,
    participation_rate: k.participationRate,
    daily_average:      k.dailyAverage,
    eco_days:           k.ecoDays,
    daily_scores:       db.json(k.dailyScores as unknown as Parameters<typeof db.json>[0]),
    computed_at:        new Date(),
  }))

  await db.begin(async (tx) => {
    await tx`DELETE FROM week_member_stats WHERE week_id = ${weekId}`
    await tx`
      INSERT INTO week_member_stats ${tx(
        rows,
        'week_id', 'player_id', 'player_name', 'player_alias', 'current_rank',
        'rank_position', 'previous_rank', 'rank_trend', 'total_score', 'raw_total_score',
        'days_played', 'participation_rate', 'daily_average', 'eco_days',
        'daily_scores', 'computed_at',
      )}
    `
  })
}

/** Returns member stats for a given week, ordered by rank position. */
export async function findWeekMemberStats(weekId: number): Promise<WeekMemberStatsRow[]> {
  return db<WeekMemberStatsRow[]>`
    SELECT * FROM week_member_stats
    WHERE week_id = ${weekId}
    ORDER BY rank_position ASC
  `
}

/** Returns the last N weeks of a player's stats (for progression chart). */
export async function findPlayerProgressionHistory(
  playerId: number,
  weekLimit = 8,
): Promise<WeekMemberStatsRow[]> {
  return db<WeekMemberStatsRow[]>`
    SELECT wms.*, w.label AS week_label
    FROM week_member_stats wms
    JOIN weeks w ON w.id = wms.week_id
    WHERE wms.player_id = ${playerId}
    ORDER BY wms.week_id DESC
    LIMIT ${weekLimit}
  `
}

// ─── Rank stats ───────────────────────────────────────────────────────────────

/**
 * Atomically replaces rank stats for a week.
 * Idempotent — safe to call multiple times.
 */
export async function saveWeekRankStats(
  weekId: number,
  stats: WeekRankStatsApi[],
): Promise<void> {
  if (stats.length === 0) return

  const rows = stats.map((s) => ({
    week_id:           weekId,
    current_rank:      s.currentRank,
    member_count:      s.memberCount,
    active_count:      s.activeCount,
    total_score:       s.totalScore,
    avg_score:         s.avgScore,
    avg_participation: s.avgParticipation,
    avg_days_played:   s.avgDaysPlayed,
    computed_at:       new Date(),
  }))

  await db.begin(async (tx) => {
    await tx`DELETE FROM week_rank_stats WHERE week_id = ${weekId}`
    await tx`
      INSERT INTO week_rank_stats ${tx(
        rows,
        'week_id', 'current_rank', 'member_count', 'active_count',
        'total_score', 'avg_score', 'avg_participation', 'avg_days_played', 'computed_at',
      )}
    `
  })
}

/** Returns rank tier stats for a given week, ordered R5→unranked. */
export async function findWeekRankStats(weekId: number): Promise<WeekRankStatsApi[]> {
  const rows = await db<WeekRankStatsRow[]>`
    SELECT * FROM week_rank_stats WHERE week_id = ${weekId}
  `

  const rankOrder = ['R5', 'R4', 'R3', 'R2', 'R1', 'unranked']

  return rows
    .map((r) => ({
      currentRank:      r.current_rank,
      memberCount:      r.member_count,
      activeCount:      r.active_count,
      totalScore:       bigintToNumber(r.total_score, 'week_rank_stats.total_score'),
      avgScore:         bigintToNumber(r.avg_score,   'week_rank_stats.avg_score'),
      avgParticipation: Number(r.avg_participation),
      avgDaysPlayed:    Number(r.avg_days_played),
    }))
    .sort((a, b) => rankOrder.indexOf(a.currentRank) - rankOrder.indexOf(b.currentRank))
}
