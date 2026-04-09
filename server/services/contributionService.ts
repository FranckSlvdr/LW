import 'server-only'
import { findContributionsByWeek, upsertContribution, deleteContribution } from '@/server/repositories/contributionRepository'
import { findPlayerById } from '@/server/repositories/playerRepository'
import { findWeekById } from '@/server/repositories/weekRepository'
import { NotFoundError, ValidationError } from '@/lib/errors'
import type { ContributionApi, UpsertContributionInput } from '@/types/api'

export async function getContributionsForWeek(weekId: number): Promise<ContributionApi[]> {
  const rows = await findContributionsByWeek(weekId)
  return rows.map((r, idx) => ({
    id:          r.id,
    playerId:    r.playerId,
    playerName:  r.playerName,
    playerAlias: r.playerAlias,
    weekId:      r.weekId,
    amount:      r.amount,
    note:        r.note,
    rank:        idx + 1,
  }))
}

export async function upsertPlayerContribution(input: UpsertContributionInput): Promise<ContributionApi> {
  const player = await findPlayerById(input.playerId)
  if (!player) throw new NotFoundError('Player', input.playerId)

  const week = await findWeekById(input.weekId)
  if (!week) throw new NotFoundError('Week', input.weekId)

  if (input.amount < 0) throw new ValidationError('amount must be ≥ 0')

  const saved = await upsertContribution(input.playerId, input.weekId, input.amount, input.note)
  const all   = await getContributionsForWeek(input.weekId)
  const rank  = all.findIndex((r) => r.playerId === input.playerId) + 1

  return {
    id:          saved.id,
    playerId:    saved.playerId,
    playerName:  player.name,
    playerAlias: player.alias,
    weekId:      saved.weekId,
    amount:      saved.amount,
    note:        saved.note,
    rank:        rank > 0 ? rank : 1,
  }
}

export async function removeContribution(playerId: number, weekId: number): Promise<void> {
  await deleteContribution(playerId, weekId)
}
