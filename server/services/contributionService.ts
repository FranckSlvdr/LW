import 'server-only'
import { unstable_cache, revalidateTag } from 'next/cache'
import { IS_VERCEL_RUNTIME, USE_NEXT_DATA_CACHE } from '@/server/config/runtime'
import { findContributionsByWeek, upsertContributionWithRank, deleteContribution } from '@/server/repositories/contributionRepository'
import { findPlayerById } from '@/server/repositories/playerRepository'
import { assertWeekOpenForManualEntry } from '@/server/services/weekService'
import { NotFoundError, ValidationError } from '@/lib/errors'
import type { ContributionApi, UpsertContributionInput } from '@/types/api'

export async function getContributionsForWeek(weekId: number): Promise<ContributionApi[]> {
  if (IS_VERCEL_RUNTIME) return getContributionsForWeekCached(weekId)()
  if (!USE_NEXT_DATA_CACHE) return readContributionsForWeek(weekId)
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
    revalidateTag(`contributions-${input.weekId}`, 'max')
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
    revalidateTag(`contributions-${weekId}`, 'max')
  } catch {}
}

async function readContributionsForWeek(weekId: number): Promise<ContributionApi[]> {
  const rows = await findContributionsByWeek(weekId)
  let rank = 1

  return rows.map((r, idx) => {
    if (idx > 0 && rows[idx - 1].amount !== r.amount) rank = idx + 1
    return {
      id:          r.id,
      playerId:    r.playerId,
      playerName:  r.playerName,
      playerAlias: r.playerAlias,
      weekId:      r.weekId,
      amount:      r.amount,
      note:        r.note,
      rank,
    }
  })
}

function getContributionsForWeekCached(weekId: number) {
  return unstable_cache(
    () => readContributionsForWeek(weekId),
    ['contributions', String(weekId)],
    { revalidate: 60, tags: [`contributions-${weekId}`] },
  )
}
