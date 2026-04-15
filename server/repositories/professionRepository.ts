import 'server-only'
import { db } from '@/server/db/client'
import type { PlayerProfessionRow } from '@/types/db'
import type { PlayerProfession } from '@/types/domain'

// ─── Mapping ──────────────────────────────────────────────────────────────────

function toProfession(row: PlayerProfessionRow): PlayerProfession {
  return {
    id:            row.id,
    playerId:      row.player_id,
    professionKey: row.profession_key,
    level:         row.level,
    updatedAt:     row.updated_at,
  }
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function findAllProfessionsWithPlayerName(): Promise<
  Array<PlayerProfession & { playerName: string }>
> {
  const rows = await db<Array<PlayerProfessionRow & { player_name: string }>>`
    SELECT pp.*, p.name AS player_name
    FROM player_professions pp
    JOIN players p ON p.id = pp.player_id
    ORDER BY pp.level DESC, p.name ASC
  `
  return rows.map((r) => ({ ...toProfession(r), playerName: r.player_name }))
}

export async function findProfessionByPlayer(playerId: number): Promise<PlayerProfession | null> {
  const rows = await db<PlayerProfessionRow[]>`
    SELECT * FROM player_professions WHERE player_id = ${playerId}
  `
  return rows[0] ? toProfession(rows[0]) : null
}

/**
 * Returns a Map<playerId, level> for all players that have a profession.
 * Used by the rating engine.
 */
export async function findAllProfessionLevels(): Promise<Map<number, number>> {
  const rows = await db<Array<{ player_id: number; level: number }>>`
    SELECT player_id, level FROM player_professions
  `
  const map = new Map<number, number>()
  for (const r of rows) {
    map.set(r.player_id, r.level)
  }
  return map
}

/** Upsert — one profession per player (enforced by DB UNIQUE constraint) */
export async function upsertProfession(data: {
  playerId: number
  professionKey: string
  level: number
}): Promise<PlayerProfession> {
  const rows = await db<PlayerProfessionRow[]>`
    INSERT INTO player_professions (player_id, profession_key, level)
    VALUES (${data.playerId}, ${data.professionKey}, ${data.level})
    ON CONFLICT (player_id) DO UPDATE SET
      profession_key = EXCLUDED.profession_key,
      level          = EXCLUDED.level,
      updated_at     = NOW()
    RETURNING *
  `
  return toProfession(rows[0])
}

/**
 * Bulk upsert professions from CSV import.
 * Skips entries where professionKey or professionLevel is null.
 */
export async function bulkUpsertProfessions(
  entries: Array<{ playerId: number; professionKey: string | null; professionLevel: number | null }>,
): Promise<number> {
  const valid = entries.filter(
    (e): e is { playerId: number; professionKey: string; professionLevel: number } =>
      e.professionKey !== null && e.professionLevel !== null,
  )
  if (valid.length === 0) return 0

  const rows = valid.map((e) => ({
    player_id:      e.playerId,
    profession_key: e.professionKey,
    level:          e.professionLevel,
  }))

  const result = await db`
    INSERT INTO player_professions ${db(rows, 'player_id', 'profession_key', 'level')}
    ON CONFLICT (player_id) DO UPDATE SET
      profession_key = EXCLUDED.profession_key,
      level          = EXCLUDED.level,
      updated_at     = NOW()
  `
  return result.count
}

export async function deleteProfession(playerId: number): Promise<boolean> {
  const result = await db`
    DELETE FROM player_professions WHERE player_id = ${playerId}
  `
  return result.count > 0
}
