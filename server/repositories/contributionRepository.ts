import 'server-only'
import { db } from '@/server/db/client'
import { bigintToNumber } from '@/lib/utils'
import type { Contribution } from '@/types/domain'

interface ContribRow {
  id: number
  player_id: number
  week_id: number
  amount: string
  note: string | null
  created_at: Date
  updated_at: Date
  player_name?: string
  player_alias?: string | null
}

function toDomain(row: ContribRow): Contribution {
  return {
    id:        row.id,
    playerId:  row.player_id,
    weekId:    row.week_id,
    amount:    bigintToNumber(row.amount, 'contributions.amount'),
    note:      row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function findContributionsByWeek(weekId: number): Promise<
  Array<Contribution & { playerName: string; playerAlias: string | null }>
> {
  const rows = await db<ContribRow[]>`
    SELECT c.*, p.name AS player_name, p.alias AS player_alias
    FROM   contributions c
    JOIN   players p ON p.id = c.player_id
    WHERE  c.week_id = ${weekId}
    ORDER  BY c.amount DESC
  `
  return rows.map((r) => ({
    ...toDomain(r),
    playerName:  r.player_name ?? '',
    playerAlias: r.player_alias ?? null,
  }))
}

/** Returns a Map<playerId, amount> sorted by amount desc */
export async function findTopContributors(weekId: number): Promise<Map<number, number>> {
  const rows = await db<Array<{ player_id: number; amount: string }>>`
    SELECT player_id, amount
    FROM   contributions
    WHERE  week_id = ${weekId}
    ORDER  BY amount DESC
  `
  const map = new Map<number, number>()
  for (const r of rows) {
    map.set(r.player_id, bigintToNumber(r.amount, 'contributions.amount'))
  }
  return map
}

export async function upsertContribution(
  playerId: number,
  weekId: number,
  amount: number,
  note?: string,
): Promise<Contribution> {
  const [row] = await db<ContribRow[]>`
    INSERT INTO contributions (player_id, week_id, amount, note, updated_at)
    VALUES (${playerId}, ${weekId}, ${amount}, ${note ?? null}, NOW())
    ON CONFLICT (player_id, week_id)
    DO UPDATE SET amount = EXCLUDED.amount, note = EXCLUDED.note, updated_at = NOW()
    RETURNING *
  `
  if (!row) throw new Error('upsertContribution: no row returned')
  return toDomain(row)
}

/**
 * Upserts a contribution and returns the player's rank in one query.
 *
 * Uses a CTE + correlated subquery so the rank is computed in SQL without a
 * separate re-fetch of all rows.  The correlated subquery uses the existing
 * idx_contributions_week index on (week_id, amount DESC).
 *
 * Ranking semantics: RANK()-style — ties share the same rank.
 */
export async function upsertContributionWithRank(
  playerId: number,
  weekId: number,
  amount: number,
  note?: string,
): Promise<Contribution & { rank: number }> {
  const [row] = await db<Array<ContribRow & { rank: number }>>`
    WITH upserted AS (
      INSERT INTO contributions (player_id, week_id, amount, note, updated_at)
      VALUES (${playerId}, ${weekId}, ${amount}, ${note ?? null}, NOW())
      ON CONFLICT (player_id, week_id)
      DO UPDATE SET amount = EXCLUDED.amount, note = EXCLUDED.note, updated_at = NOW()
      RETURNING *
    )
    SELECT
      u.*,
      (
        SELECT COUNT(*)::int + 1
        FROM   contributions
        WHERE  week_id = ${weekId}
        AND    amount  > u.amount
      ) AS rank
    FROM upserted u
  `
  if (!row) throw new Error('upsertContributionWithRank: no row returned')
  return { ...toDomain(row), rank: row.rank }
}

export async function deleteContribution(playerId: number, weekId: number): Promise<void> {
  await db`
    DELETE FROM contributions
    WHERE player_id = ${playerId} AND week_id = ${weekId}
  `
}
