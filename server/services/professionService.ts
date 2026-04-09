import 'server-only'
import {
  findAllProfessionsWithPlayerName,
  upsertProfession,
  deleteProfession,
} from '@/server/repositories/professionRepository'
import { findPlayerById } from '@/server/repositories/playerRepository'
import { NotFoundError } from '@/lib/errors'
import type { ProfessionApi, UpsertProfessionInput } from '@/types/api'

function toProfessionApi(
  row: { id: number; playerId: number; professionKey: string; level: number; updatedAt: Date },
  playerName: string,
): ProfessionApi {
  return {
    id:            row.id,
    playerId:      row.playerId,
    playerName,
    professionKey: row.professionKey,
    level:         row.level,
    updatedAt:     row.updatedAt.toISOString(),
  }
}

export async function getAllProfessions(): Promise<ProfessionApi[]> {
  const rows = await findAllProfessionsWithPlayerName()
  return rows.map((r) => toProfessionApi(r, r.playerName))
}

export async function setProfession(input: UpsertProfessionInput): Promise<ProfessionApi> {
  const player = await findPlayerById(input.playerId)
  if (!player) throw new NotFoundError(`Player ${input.playerId} not found`)

  const result = await upsertProfession({
    playerId:      input.playerId,
    professionKey: input.professionKey,
    level:         input.level,
  })

  return toProfessionApi(result, player.name)
}

export async function removeProfession(playerId: number): Promise<void> {
  const deleted = await deleteProfession(playerId)
  if (!deleted) throw new NotFoundError(`No profession found for player ${playerId}`)
}
