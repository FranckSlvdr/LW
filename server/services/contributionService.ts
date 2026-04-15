import 'server-only'
import { unstable_cache, revalidateTag } from 'next/cache'
import { findContributionsByWeek, upsertContributionWithRank, deleteContribution } from '@/server/repositories/contributionRepository'
import { findPlayerById } from '@/server/repositories/playerRepository'
import { assertWeekOpenForManualEntry } from '@/server/services/weekService'
import { NotFoundError, ValidationError } from '@/lib/errors'
import type { ContributionApi, UpsertContributionInput } from '@/types/api'

export async function getContributionsForWeek(weekId: number): Promise<ContributionApi[]> {
  return getContributionsForWeekCached(weekId)()
}

export async function upsertPlayerContribution(input: UpsertContributionInput): Promise<ContributionApi> {
  const player = await findPlayerById(input.playerId)
  if (!player) throw new NotFoundError('Player', input.playerId)

  await assertWeekOpenForManualEntry(input.weekId)

  if (input.amount < 0) throw new ValidationError('amount must be ≥ 0')

  // Upsert + rank computed in one SQL query — no separate re-fetch of all rows
  const saved = await upsertContributionWithRank(input.playerId, input.weekId, input.amount, input.note)
  try {
    revalidateTag(`contributions-${input.weekId}`, { expire: 0 })
  } catch {}

  return {
    id:          saved.id,
    playerId:    saved.playerId,
    playerName:  player.name,
    playerAlias: player.alias,
    weekId:      saved.weekId,
    amount:      saved.amount,
    note:        saved.note,
    rank:        saved.rank,
  }
}

export async function removeContribution(playerId: number, weekId: number): Promise<void> {
  await deleteContribution(playerId, weekId)
  try {
    revalidateTag(`contributions-${weekId}`, { expire: 0 })
  } catch {}
}

function getContributionsForWeekCached(weekId: number) {
  return unstable_cache(
    async () => {
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
    },
    ['contributions', String(weekId)],
    { revalidate: 60, tags: [`contributions-${weekId}`] },
  )
}
