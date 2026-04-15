import 'server-only'
import { db } from '@/server/db/client'
import { bigintToNumber } from '@/lib/utils'
import type { DailyScoreRow } from '@/types/db'
import type { DailyScore, DayOfWeek, ImportSource } from '@/types/domain'
import type { UpsertScoreInput, UpsertScoresBulkInput } from '@/server/validators/scoreValidator'

// ─── Mapping ──────────────────────────────────────────────────────────────────

function toScore(row: DailyScoreRow): DailyScore {
  return {
    id: row.id,
    playerId: row.player_id,
    weekId: row.week_id,
    dayOfWeek: row.day_of_week as DayOfWeek,
    score: bigintToNumber(row.score, 'daily_scores.score'),
    isEco: row.is_eco,
    source: row.source as ImportSource,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function findScoresByWeek(weekId: number): Promise<DailyScore[]> {
  const rows = await db<DailyScoreRow[]>`
    SELECT * FROM daily_scores
    WHERE week_id = ${weekId}
    ORDER BY player_id ASC, day_of_week ASC
  `
  return rows.map(toScore)
}

export async function findScoresByPlayer(playerId: number): Promise<DailyScore[]> {
  const rows = await db<DailyScoreRow[]>`
    SELECT * FROM daily_scores
    WHERE player_id = ${playerId}
    ORDER BY week_id DESC, day_of_week ASC
  `
  return rows.map(toScore)
}

export async function findScoresByWeekAndPlayer(
  weekId: number,
  playerId: number,
): Promise<DailyScore[]> {
  const rows = await db<DailyScoreRow[]>`
    SELECT * FROM daily_scores
    WHERE week_id = ${weekId} AND player_id = ${playerId}
    ORDER BY day_of_week ASC
  `
  return rows.map(toScore)
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function upsertScore(input: UpsertScoreInput): Promise<DailyScore> {
  const rows = await db<DailyScoreRow[]>`
    INSERT INTO daily_scores (player_id, week_id, day_of_week, score)
    VALUES (${input.playerId}, ${input.weekId}, ${input.dayOfWeek}, ${input.score})
    ON CONFLICT (player_id, week_id, day_of_week)
    DO UPDATE SET
      score      = EXCLUDED.score,
      updated_at = NOW()
    RETURNING *
  `
  return toScore(rows[0])
}

/**
 * Bulk upsert — used for manual entry forms and CSV imports.
 * Runs in a single transaction for atomicity.
 */
export async function upsertScoresBulk(
  input: UpsertScoresBulkInput,
  source: ImportSource = 'manual',
): Promise<number> {
  if (input.scores.length === 0) return 0

  const rows = input.scores.map((s) => ({
    player_id: s.playerId,
    week_id: input.weekId,
    day_of_week: s.dayOfWeek,
    score: s.score,
    source,
  }))

  const result = await db`
    INSERT INTO daily_scores ${db(rows, 'player_id', 'week_id', 'day_of_week', 'score', 'source')}
    ON CONFLICT (player_id, week_id, day_of_week)
    DO UPDATE SET
      score      = EXCLUDED.score,
      source     = EXCLUDED.source,
      updated_at = NOW()
  `
  return result.count
}

/**
 * Returns a Map<playerId, totalScore> for the top `limit` VS scorers
 * of a given week. If `days` is non-empty, only those days are summed;
 * otherwise all days are used.
 */
export async function findTopVsScorers(
  weekId: number,
  limit: number,
  days: number[] = [],
): Promise<Map<number, number>> {
  if (limit <= 0) return new Map()

  const rows = days.length > 0
    ? await db<{ player_id: number; total: string }[]>`
        SELECT player_id, SUM(score)::text AS total
        FROM   daily_scores
        WHERE  week_id    = ${weekId}
          AND  day_of_week = ANY(${days})
        GROUP  BY player_id
        ORDER  BY SUM(score) DESC
        LIMIT  ${limit}
      `
    : await db<{ player_id: number; total: string }[]>`
        SELECT player_id, SUM(score)::text AS total
        FROM   daily_scores
        WHERE  week_id = ${weekId}
        GROUP  BY player_id
        ORDER  BY SUM(score) DESC
        LIMIT  ${limit}
      `

  return new Map(rows.map((r) => [r.player_id, bigintToNumber(r.total, 'vs_scorer.total')]))
}

/** Marks eco days — called by ecoDayDetector after computing flags */
export async function markEcoDays(
  weekId: number,
  ecoEntries: Array<{ playerId: number; dayOfWeek: DayOfWeek }>,
): Promise<void> {
  if (ecoEntries.length === 0) return

  const playerIds  = ecoEntries.map((e) => e.playerId)
  const dayOfWeeks = ecoEntries.map((e) => e.dayOfWeek)

  // 2 queries total regardless of entry count (bulk UNNEST instead of N loops)
  await db.begin(async (tx) => {
    await tx`UPDATE daily_scores SET is_eco = FALSE WHERE week_id = ${weekId}`
    await tx`
      UPDATE daily_scores SET is_eco = TRUE
      WHERE week_id = ${weekId}
        AND (player_id, day_of_week) IN (
          SELECT * FROM UNNEST(${playerIds}::int[], ${dayOfWeeks}::int[])
        )
    `
  })
}
