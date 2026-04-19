import type { PlayerApi } from '@/types/api'
import { PLAYER_RANKS } from '@/types/domain'
import type { PlayerRank } from '@/types/domain'

export type FilterStatus = 'all' | 'active' | 'inactive'
export type FilterRank = 'all' | 'unclassified' | PlayerRank
export type FilterLevel = number | null

export interface PlayersSummary {
  filtered: PlayerApi[]
  activeCount: number
  inactiveCount: number
  unclassifiedCount: number
  rankCounts: Record<PlayerRank, number>
  sortedLevels: Array<{ level: number; count: number }>
  unfilledLevels: number
}

export const MAX_PROFESSION_LEVEL = 100

export const RANK_BADGE_VARIANT: Record<PlayerRank, 'danger' | 'warning' | 'success' | 'info' | 'neutral'> = {
  R5: 'danger',
  R4: 'warning',
  R3: 'success',
  R2: 'info',
  R1: 'neutral',
}

export const PROFESSION_ICON: Record<string, string> = {
  engineer: '\u{2699}\uFE0F',
  warlord:  '\u2694\uFE0F',
}

export function comparePlayers(a: PlayerApi, b: PlayerApi): number {
  const rankA = a.currentRank ?? ''
  const rankB = b.currentRank ?? ''

  if (rankA !== rankB) {
    if (!rankA) return 1
    if (!rankB) return -1
    return rankB.localeCompare(rankA)
  }

  return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
}

export function sortPlayers(players: PlayerApi[]): PlayerApi[] {
  return [...players].sort(comparePlayers)
}

export function summarizePlayers(
  rows: PlayerApi[],
  filterStatus: FilterStatus,
  filterRank: FilterRank,
  filterLevel: FilterLevel,
): PlayersSummary {
  const rankCounts = Object.fromEntries(
    PLAYER_RANKS.map((rank) => [rank, 0]),
  ) as Record<PlayerRank, number>
  const levelCounts = new Map<number, number>()
  const filtered: PlayerApi[] = []

  let activeCount = 0
  let inactiveCount = 0
  let unclassifiedCount = 0
  let unfilledLevels = 0

  for (const player of rows) {
    if (player.isActive) {
      activeCount++
      if (player.currentRank) rankCounts[player.currentRank as PlayerRank]++
      else unclassifiedCount++

      if (player.generalLevel == null) unfilledLevels++
      else {
        levelCounts.set(
          player.generalLevel,
          (levelCounts.get(player.generalLevel) ?? 0) + 1,
        )
      }
    } else {
      inactiveCount++
    }

    const statusOk =
      filterStatus === 'all' ||
      (filterStatus === 'active' ? player.isActive : !player.isActive)
    const rankOk =
      filterRank === 'all' ||
      (filterRank === 'unclassified'
        ? !player.currentRank
        : player.currentRank === filterRank)
    const levelOk =
      filterLevel === null || player.generalLevel === filterLevel

    if (statusOk && rankOk && levelOk) filtered.push(player)
  }

  const sortedLevels = Array.from(levelCounts.entries())
    .map(([level, count]) => ({ level, count }))
    .sort((a, b) => b.level - a.level)

  return {
    filtered,
    activeCount,
    inactiveCount,
    unclassifiedCount,
    rankCounts,
    sortedLevels,
    unfilledLevels,
  }
}
