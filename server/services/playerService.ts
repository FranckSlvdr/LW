import 'server-only'
import {
  findAllPlayers,
  findPlayerById,
  createPlayer,
  updatePlayer,
  deactivatePlayer,
  deletePlayer,
} from '@/server/repositories/playerRepository'
import { createPlayerSchema, updatePlayerSchema } from '@/server/validators/playerValidator'
import { NotFoundError } from '@/lib/errors'
import type { PlayerApi } from '@/types/api'
import type { Player } from '@/types/domain'

// ─── Mapping ──────────────────────────────────────────────────────────────────

export function toPlayerApi(p: Player): PlayerApi {
  return {
    id:            p.id,
    name:          p.name,
    alias:         p.alias,
    currentRank:   p.currentRank,
    suggestedRank: p.suggestedRank,
    rankReason:    p.rankReason,
    isActive:      p.isActive,
    joinedAt:      p.joinedAt?.toISOString().split('T')[0] ?? null,
    leftAt:        p.leftAt?.toISOString().split('T')[0] ?? null,
  }
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getAllPlayers(activeOnly = true): Promise<PlayerApi[]> {
  const players = await findAllPlayers(activeOnly)
  return players.map(toPlayerApi)
}

export async function getPlayerById(id: number): Promise<PlayerApi> {
  const player = await findPlayerById(id)
  if (!player) throw new NotFoundError('Player', id)
  return toPlayerApi(player)
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createNewPlayer(raw: unknown): Promise<PlayerApi> {
  const input = createPlayerSchema.parse(raw)
  const player = await createPlayer(input)
  return toPlayerApi(player)
}

export async function updateExistingPlayer(id: number, raw: unknown): Promise<PlayerApi> {
  const input = updatePlayerSchema.parse(raw)

  // When toggling isActive, set left_at / clear it consistently
  if (input.isActive === false && input.leftAt === undefined) {
    input.leftAt = new Date().toISOString().split('T')[0]
  } else if (input.isActive === true && input.leftAt === undefined) {
    input.leftAt = null
  }

  const player = await updatePlayer(id, input)
  if (!player) throw new NotFoundError('Player', id)
  return toPlayerApi(player)
}

export async function deactivateExistingPlayer(id: number): Promise<void> {
  const ok = await deactivatePlayer(id)
  if (!ok) throw new NotFoundError('Player', id)
}

export async function deleteExistingPlayer(id: number): Promise<void> {
  const ok = await deletePlayer(id)
  if (!ok) throw new NotFoundError('Player', id)
}
