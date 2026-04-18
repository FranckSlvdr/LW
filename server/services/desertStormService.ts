import 'server-only'
import { unstable_cache, revalidateTag } from 'next/cache'
import { IS_VERCEL_RUNTIME, USE_NEXT_DATA_CACHE } from '@/server/config/runtime'
import { findDsScoresByWeek, upsertDsScoreWithRank, deleteDsScore } from '@/server/repositories/desertStormRepository'
import {
  findDsRegistrationsByWeek,
  upsertDsRegistration,
  clearTop3RankForTeam,
  deleteDsRegistration,
} from '@/server/repositories/desertStormRegistrationRepository'
import { findPlayerById } from '@/server/repositories/playerRepository'
import { assertWeekOpenForManualEntry } from '@/server/services/weekService'
import { NotFoundError, ValidationError } from '@/lib/errors'
import type { DesertStormScoreApi, UpsertDesertStormInput, DsRegistrationApi, UpsertDsRegistrationInput } from '@/types/api'

export async function getDsScoresForWeek(weekId: number): Promise<DesertStormScoreApi[]> {
  if (IS_VERCEL_RUNTIME) return getDsScoresForWeekCached(weekId)()
  if (!USE_NEXT_DATA_CACHE) return readDsScoresForWeek(weekId)
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
    revalidateTag(`desert-storm-${input.weekId}`, 'max')
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
    revalidateTag(`desert-storm-${weekId}`, 'max')
  } catch {}
}

// ─── Registration service ─────────────────────────────────────────────────────

export async function getDsRegistrationsForWeek(weekId: number): Promise<DsRegistrationApi[]> {
  if (IS_VERCEL_RUNTIME) return getDsRegistrationsForWeekCached(weekId)()
  if (!USE_NEXT_DATA_CACHE) return findDsRegistrationsByWeek(weekId)
  return getDsRegistrationsForWeekCached(weekId)()
}

export async function saveDsRegistration(input: UpsertDsRegistrationInput): Promise<DsRegistrationApi> {
  const player = await findPlayerById(input.playerId)
  if (!player) throw new NotFoundError('Player', input.playerId)

  // Garantir l'unicité du top3_rank par équipe : vider le joueur précédemment classé
  if (input.top3Rank !== null) {
    await clearTop3RankForTeam(input.weekId, input.team, input.top3Rank, input.playerId)
  }

  const saved = await upsertDsRegistration({
    playerId:  input.playerId,
    weekId:    input.weekId,
    team:      input.team,
    role:      input.role,
    present:   input.present,
    top3Rank:  input.top3Rank,
  })

  try { revalidateTag(`ds-reg-${input.weekId}`, 'max') } catch {}

  return saved
}

export async function removeDsRegistration(playerId: number, weekId: number): Promise<void> {
  await deleteDsRegistration(playerId, weekId)
  try { revalidateTag(`ds-reg-${weekId}`, 'max') } catch {}
}

function getDsRegistrationsForWeekCached(weekId: number) {
  return unstable_cache(
    () => findDsRegistrationsByWeek(weekId),
    ['ds-registrations', String(weekId)],
    { revalidate: 60, tags: [`ds-reg-${weekId}`] },
  )
}

async function readDsScoresForWeek(weekId: number): Promise<DesertStormScoreApi[]> {
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
}

// ─── Legacy score service (conservé pour les trains) ─────────────────────────

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
