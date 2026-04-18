import 'server-only'
import { db } from '@/server/db/client'
import type { DsTeam, DsRole } from '@/types/api'

// ─── Row type ────────────────────────────────────────────────────────────────

interface DsRegRow {
  id: number
  week_id: number
  player_id: number
  team: string
  role: string
  present: boolean
  top3_rank: number | null
  created_at: Date
  updated_at: Date
  player_name?: string
  player_alias?: string | null
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export interface DsRegRecord {
  id: number
  weekId: number
  playerId: number
  playerName: string
  playerAlias: string | null
  team: DsTeam
  role: DsRole
  present: boolean
  top3Rank: 1 | 2 | 3 | null
}

export async function findDsRegistrationsByWeek(weekId: number): Promise<DsRegRecord[]> {
  const rows = await db<DsRegRow[]>`
    SELECT r.*, p.name AS player_name, p.alias AS player_alias
    FROM   desert_storm_registrations r
    JOIN   players p ON p.id = r.player_id
    WHERE  r.week_id = ${weekId}
    ORDER  BY r.team, r.role DESC, p.name
  `
  return rows.map(toRecord)
}

function toRecord(r: DsRegRow): DsRegRecord {
  return {
    id:          r.id,
    weekId:      r.week_id,
    playerId:    r.player_id,
    playerName:  r.player_name ?? '',
    playerAlias: r.player_alias ?? null,
    team:        r.team as DsTeam,
    role:        r.role as DsRole,
    present:     r.present,
    top3Rank:    (r.top3_rank as 1 | 2 | 3 | null) ?? null,
  }
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/** Réinitialise le top3_rank d'un autre joueur pour éviter les doublons */
export async function clearTop3RankForTeam(
  weekId: number,
  team: string,
  rank: number,
  exceptPlayerId: number,
): Promise<void> {
  await db`
    UPDATE desert_storm_registrations
    SET    top3_rank  = NULL,
           updated_at = NOW()
    WHERE  week_id    = ${weekId}
    AND    team       = ${team}
    AND    top3_rank  = ${rank}
    AND    player_id != ${exceptPlayerId}
  `
}

export async function upsertDsRegistration(input: {
  playerId: number
  weekId: number
  team: string
  role: string
  present: boolean
  top3Rank: number | null
}): Promise<DsRegRecord> {
  const [row] = await db<DsRegRow[]>`
    INSERT INTO desert_storm_registrations
      (player_id, week_id, team, role, present, top3_rank, updated_at)
    VALUES
      (${input.playerId}, ${input.weekId}, ${input.team}, ${input.role},
       ${input.present}, ${input.top3Rank}, NOW())
    ON CONFLICT (player_id, week_id)
    DO UPDATE SET
      team       = EXCLUDED.team,
      role       = EXCLUDED.role,
      present    = EXCLUDED.present,
      top3_rank  = EXCLUDED.top3_rank,
      updated_at = NOW()
    RETURNING
      id, week_id, player_id, team, role, present, top3_rank, created_at, updated_at
  `
  if (!row) throw new Error('upsertDsRegistration: no row returned')

  // Joindre le nom du joueur
  const [player] = await db<Array<{ name: string; alias: string | null }>>`
    SELECT name, alias FROM players WHERE id = ${input.playerId}
  `
  return {
    id:          row.id,
    weekId:      row.week_id,
    playerId:    row.player_id,
    playerName:  player?.name ?? '',
    playerAlias: player?.alias ?? null,
    team:        row.team as DsTeam,
    role:        row.role as DsRole,
    present:     row.present,
    top3Rank:    (row.top3_rank as 1 | 2 | 3 | null) ?? null,
  }
}

export async function deleteDsRegistration(playerId: number, weekId: number): Promise<void> {
  await db`
    DELETE FROM desert_storm_registrations
    WHERE player_id = ${playerId}
    AND   week_id   = ${weekId}
  `
}
