import 'server-only'
import { unstable_cache, revalidateTag } from 'next/cache'
import { findDsScoresByWeek, upsertDsScoreWithRank, deleteDsScore } from '@/server/repositories/desertStormRepository'
import { findPlayerById } from '@/server/repositories/playerRepository'
import { assertWeekOpenForManualEntry } from '@/server/services/weekService'
import { NotFoundError, ValidationError } from '@/lib/errors'
import type { DesertStormScoreApi, UpsertDesertStormInput } from '@/types/api'

export async function getDsScoresForWeek(weekId: number): Promise<DesertStormScoreApi[]> {
  return getDsScoresForWeekCached(weekId)()
}

export async function upsertDsScoreForPlayer(input: UpsertDesertStormInput): Promise<DesertStormScoreApi> {
  const player = await findPlayerById(input.playerId)
  if (!player) throw new NotFoundError('Player', input.playerId)

  await assertWeekOpenForManualEntry(input.weekId)

  if (input.score < 0) throw new ValidationError('score must be ≥ 0')

  // Upsert + rank computed in one SQL query — no separate re-fetch of all rows
  const saved = await upsertDsScoreWithRank(input.playerId, input.weekId, input.score)
  try {
    revalidateTag(`desert-storm-${input.weekId}`, { expire: 0 })
  } catch {}

  return {
    id:          saved.id,
    playerId:    saved.playerId,
    playerName:  player.name,
    playerAlias: player.alias,
    weekId:      saved.weekId,
    score:       saved.score,
    rank:        saved.rank,
  }
}

export async function removeDsScore(playerId: number, weekId: number): Promise<void> {
  await deleteDsScore(playerId, weekId)
  try {
    revalidateTag(`desert-storm-${weekId}`, { expire: 0 })
  } catch {}
}

function getDsScoresForWeekCached(weekId: number) {
  return unstable_cache(
    async () => {
      const rows = await findDsScoresByWeek(weekId)
      return rows.map((r, idx) => ({
        id:          r.id,
        playerId:    r.playerId,
        playerName:  r.playerName,
        playerAlias: r.playerAlias,
        weekId:      r.weekId,
        score:       r.score,
        rank:        idx + 1,
      }))
    },
    ['desert-storm', String(weekId)],
    { revalidate: 60, tags: [`desert-storm-${weekId}`] },
  )
}
