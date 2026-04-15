import 'server-only'
import { db } from '@/server/db/client'
import { normalizePlayerName } from '@/lib/utils'
import type { PlayerRow } from '@/types/db'
import type { Player, PlayerRank } from '@/types/domain'
import type { CreatePlayerInput, UpdatePlayerInput } from '@/server/validators/playerValidator'

// ─── Mapping ──────────────────────────────────────────────────────────────────

function toPlayer(row: PlayerRow): Player {
  return {
    id:              row.id,
    name:            row.name,
    normalizedName:  row.normalized_name,
    alias:           row.alias,
    currentRank:     (row.current_rank   as PlayerRank) ?? null,
    suggestedRank:   (row.suggested_rank as PlayerRank) ?? null,
    rankReason:      row.rank_reason ?? null,
    joinedAt:        row.joined_at,
    leftAt:          row.left_at,
    isActive:        row.is_active,
    generalLevel:    row.general_level ?? null,
    professionKey:   row.profession_key ?? null,
    professionLevel: row.profession_level ?? null,
    createdAt:       row.created_at,
    updatedAt:       row.updated_at,
  }
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function findAllPlayers(activeOnly = true): Promise<Player[]> {
  const rows = activeOnly
    ? await db<PlayerRow[]>`
        SELECT p.*, pp.profession_key, pp.level AS profession_level
        FROM players p
        LEFT JOIN player_professions pp ON pp.player_id = p.id
        WHERE p.is_active = TRUE
        ORDER BY p.current_rank DESC NULLS LAST, p.name ASC
      `
    : await db<PlayerRow[]>`
        SELECT p.*, pp.profession_key, pp.level AS profession_level
        FROM players p
        LEFT JOIN player_professions pp ON pp.player_id = p.id
        ORDER BY
          CASE p.current_rank
            WHEN 'R5' THEN 1 WHEN 'R4' THEN 2 WHEN 'R3' THEN 3
            WHEN 'R2' THEN 4 WHEN 'R1' THEN 5 ELSE 6
          END,
          p.name ASC
      `
  return rows.map(toPlayer)
}

export async function findPlayerById(id: number): Promise<Player | null> {
  const rows = await db<PlayerRow[]>`
    SELECT p.*, pp.profession_key, pp.level AS profession_level
    FROM players p
    LEFT JOIN player_professions pp ON pp.player_id = p.id
    WHERE p.id = ${id}
    LIMIT 1
  `
  return rows[0] ? toPlayer(rows[0]) : null
}

export async function findPlayerByNormalizedName(
  normalizedName: string,
): Promise<Player | null> {
  const rows = await db<PlayerRow[]>`
    SELECT * FROM players
    WHERE normalized_name = ${normalizedName}
    LIMIT 1
  `
  return rows[0] ? toPlayer(rows[0]) : null
}

/** Returns a map of normalized_name → id for fast CSV import lookups */
export async function findPlayerNameMap(): Promise<Map<string, number>> {
  const rows = await db<{ id: number; normalized_name: string }[]>`
    SELECT id, normalized_name FROM players WHERE is_active = TRUE
  `
  return new Map(rows.map((r) => [r.normalized_name, r.id]))
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createPlayer(input: CreatePlayerInput): Promise<Player> {
  const normalizedName = normalizePlayerName(input.name)
  const rows = await db<PlayerRow[]>`
    INSERT INTO players (name, normalized_name, alias, current_rank, joined_at)
    VALUES (
      ${input.name.trim()},
      ${normalizedName},
      ${input.alias ?? null},
      ${input.currentRank ?? null},
      ${input.joinedAt ?? null}
    )
    RETURNING *
  `
  return toPlayer(rows[0])
}

export async function updatePlayer(
  id: number,
  input: UpdatePlayerInput,
): Promise<Player | null> {
  const sets: Record<string, unknown> = { updated_at: new Date() }

  if (input.name !== undefined) {
    sets.name = input.name.trim()
    sets.normalized_name = normalizePlayerName(input.name)
  }
  if (input.alias         !== undefined) sets.alias          = input.alias
  if (input.currentRank   !== undefined) sets.current_rank   = input.currentRank
  if (input.suggestedRank !== undefined) sets.suggested_rank = input.suggestedRank
  if (input.rankReason    !== undefined) sets.rank_reason    = input.rankReason
  if (input.isActive      !== undefined) sets.is_active      = input.isActive
  if (input.joinedAt      !== undefined) sets.joined_at      = input.joinedAt
  if (input.leftAt        !== undefined) sets.left_at        = input.leftAt
  if (input.generalLevel  !== undefined) sets.general_level  = input.generalLevel

  const rows = await db<PlayerRow[]>`
    WITH updated AS (
      UPDATE players
      SET ${db(sets)}
      WHERE id = ${id}
      RETURNING id
    )
    SELECT p.*, pp.profession_key, pp.level AS profession_level
    FROM players p
    LEFT JOIN player_professions pp ON pp.player_id = p.id
    WHERE p.id = (SELECT id FROM updated)
  `
  return rows[0] ? toPlayer(rows[0]) : null
}

export async function deactivatePlayer(id: number): Promise<boolean> {
  const rows = await db<{ id: number }[]>`
    UPDATE players
    SET is_active = FALSE, left_at = COALESCE(left_at, CURRENT_DATE), updated_at = NOW()
    WHERE id = ${id}
    RETURNING id
  `
  return rows.length > 0
}

export async function deletePlayer(id: number): Promise<boolean> {
  const rows = await db<{ id: number }[]>`
    DELETE FROM players WHERE id = ${id} RETURNING id
  `
  return rows.length > 0
}

/**
 * Bulk insert players from CSV import.
 * On conflict (normalized_name already exists):
 *   - Updates current_rank if the CSV provides one and the player currently has none
 *   - Updates is_active if the CSV explicitly sets it to FALSE
 * Returns inserted + updated count.
 */
export async function bulkInsertPlayers(
  players: Array<{ name: string; alias?: string; currentRank?: string | null; isActive?: boolean; generalLevel?: number | null }>,
): Promise<{ count: number; nameMap: Map<string, number> }> {
  if (players.length === 0) return { count: 0, nameMap: new Map() }

  const rows = players.map((p) => ({
    name:            p.name.trim(),
    normalized_name: normalizePlayerName(p.name),
    alias:           p.alias ?? null,
    current_rank:    p.currentRank ?? null,
    is_active:       p.isActive ?? true,
    general_level:   p.generalLevel ?? null,
  }))

  await db`
    INSERT INTO players ${db(rows, 'name', 'normalized_name', 'alias', 'current_rank', 'is_active', 'general_level')}
    ON CONFLICT (normalized_name) DO UPDATE SET
      current_rank = CASE
        WHEN EXCLUDED.current_rank IS NOT NULL THEN EXCLUDED.current_rank
        ELSE players.current_rank
      END,
      is_active = CASE
        WHEN EXCLUDED.is_active = FALSE THEN FALSE
        ELSE players.is_active
      END,
      general_level = CASE
        WHEN EXCLUDED.general_level IS NOT NULL THEN EXCLUDED.general_level
        ELSE players.general_level
      END,
      updated_at = NOW()
  `

  // Fetch ids for the inserted/updated rows in a separate typed query
  const normalizedNames = rows.map((r) => r.normalized_name)
  const idRows = await db<Array<{ id: number; normalized_name: string }>>`
    SELECT id, normalized_name FROM players WHERE normalized_name = ANY(${normalizedNames})
  `
  const nameMap = new Map(idRows.map((r) => [r.normalized_name, r.id]))
  return { count: idRows.length, nameMap }
}

/** Set suggested rank and reason — called by the rank recommendation engine */
export async function setSuggestedRank(
  playerId: number,
  suggestedRank: PlayerRank | null,
  reason: string | null,
): Promise<void> {
  await db`
    UPDATE players
    SET suggested_rank = ${suggestedRank},
        rank_reason    = ${reason},
        updated_at     = NOW()
    WHERE id = ${playerId}
  `
}
