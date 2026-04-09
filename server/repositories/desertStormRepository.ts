import 'server-only'
import { db } from '@/server/db/client'
import { bigintToNumber } from '@/lib/utils'
import type { DesertStormScore } from '@/types/domain'

// ─── Row type ────────────────────────────────────────────────────────────────

interface DsRow {
  id: number
  player_id: number
  week_id: number
  score: string
  created_at: Date
  updated_at: Date
  // joined from players
  player_name?: string
  player_alias?: string | null
}

function toDomain(row: DsRow): DesertStormScore {
  return {
    id:        row.id,
    playerId:  row.player_id,
    weekId:    row.week_id,
    score:     bigintToNumber(row.score, 'desert_storm_scores.score'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function findDsScoresByWeek(weekId: number): Promise<
  Array<DesertStormScore & { playerName: string; playerAlias: string | null }>
> {
  const rows = await db<DsRow[]>`
    SELECT ds.*, p.name AS player_name, p.alias AS player_alias
    FROM   desert_storm_scores ds
    JOIN   players p ON p.id = ds.player_id
    WHERE  ds.week_id = ${weekId}
    ORDER  BY ds.score DESC
  `
  return rows.map((r) => ({
    ...toDomain(r),
    playerName:  r.player_name ?? '',
    playerAlias: r.player_alias ?? null,
  }))
}

/** Returns a Map<playerId, score> for the top 2 scorers in a week */
export async function findTopDsScorers(weekId: number, limit = 2): Promise<Map<number, number>> {
  const rows = await db<Array<{ player_id: number; score: string }>>`
    SELECT player_id, score
    FROM   desert_storm_scores
    WHERE  week_id = ${weekId}
    ORDER  BY score DESC
    LIMIT  ${limit}
  `
  const map = new Map<number, number>()
  for (const r of rows) {
    map.set(r.player_id, bigintToNumber(r.score, 'desert_storm_scores.score'))
  }
  return map
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function upsertDsScore(
  playerId: number,
  weekId: number,
  score: number,
): Promise<DesertStormScore> {
  const [row] = await db<DsRow[]>`
    INSERT INTO desert_storm_scores (player_id, week_id, score, updated_at)
    VALUES (${playerId}, ${weekId}, ${score}, NOW())
    ON CONFLICT (player_id, week_id)
    DO UPDATE SET score = EXCLUDED.score, updated_at = NOW()
    RETURNING *
  `
  if (!row) throw new Error('upsertDsScore: no row returned')
  return toDomain(row)
}

export async function deleteDsScore(playerId: number, weekId: number): Promise<void> {
  await db`
    DELETE FROM desert_storm_scores
    WHERE player_id = ${playerId} AND week_id = ${weekId}
  `
}
