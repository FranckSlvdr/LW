/**
 * Train Engine — pure selection algorithm, no DB access.
 *
 * Selection logic per day:
 *  1. Build eligible pool = active players - excluded (prev N weeks)
 *  2. Reserve slots for:
 *     - top 2 DS scorers (if includeDsTop2 && they are eligible)
 *     - best contributor   (if includeBestContributor && eligible)
 *  3. Fill remaining slots randomly from remaining eligible pool
 *  4. Return selections with explicit reasons + excluded list
 */

import type { Player, SelectionReason } from '@/types/domain'

// ─── Public interface ─────────────────────────────────────────────────────────

export interface TrainEngineSettings {
  exclusionWindowWeeks: 0 | 1 | 2 | 3
  includeDsTop2: boolean
  includeBestContributor: boolean
  totalDriversPerDay: number
  vsTopCount: number
  vsTopDays: number[]
}

export interface TrainEngineInput {
  settings: TrainEngineSettings
  activePlayers: Player[]
  /** Player IDs that were selected in the previous N weeks (from train_selections) */
  recentlySelectedIds: Set<number>
  /** weeksAgo for each recently selected player (used in the excluded list output) */
  recentlySelectedWeeksAgo: Map<number, number>
  /** Map<playerId, DS score> for the current week */
  dsScores: Map<number, number>
  /** Map<playerId, contribution amount> for the current week */
  contributions: Map<number, number>
  /**
   * Set of player IDs eligible based on the VS top filter (from previous week).
   * Empty set = no VS filter applied (everyone remains eligible).
   */
  vsEligibleIds: Set<number>
  /** Optional seed for deterministic testing (undefined = use Math.random) */
  randomSeed?: number
}

export interface TrainEngineSelection {
  playerId: number
  position: number
  reason: SelectionReason
}

export interface TrainEngineExcluded {
  playerId: number
  weeksAgo: number
}

export interface TrainEngineOutput {
  selections: TrainEngineSelection[]
  excluded: TrainEngineExcluded[]
}

// ─── Engine ───────────────────────────────────────────────────────────────────

export function runTrainSelection(input: TrainEngineInput): TrainEngineOutput {
  const { settings, activePlayers, recentlySelectedIds, recentlySelectedWeeksAgo, dsScores, contributions, vsEligibleIds } = input

  const totalSlots = Math.max(1, settings.totalDriversPerDay)

  // ── Step 1: Split eligible vs excluded ────────────────────────────────────
  const excluded: TrainEngineExcluded[] = []
  const eligible = new Set<number>()

  for (const player of activePlayers) {
    if (settings.exclusionWindowWeeks > 0 && recentlySelectedIds.has(player.id)) {
      excluded.push({
        playerId: player.id,
        weeksAgo: recentlySelectedWeeksAgo.get(player.id) ?? 1,
      })
    } else {
      eligible.add(player.id)
    }
  }

  // ── Step 1b: VS filter — restrict pool to top VS scorers of previous week ─
  // Applied only when vsTopCount > 0 AND we have data for the previous week.
  // If the previous week has no VS data, the filter is skipped so the draw
  // still works (avoids an empty pool on the first week).
  if (settings.vsTopCount > 0 && vsEligibleIds.size > 0) {
    for (const id of [...eligible]) {
      if (!vsEligibleIds.has(id)) eligible.delete(id)
    }
  }

  const selections: TrainEngineSelection[] = []
  const used = new Set<number>()

  // ── Step 2: Reserved slots (only from eligible pool) ──────────────────────
  if (settings.includeDsTop2 && selections.length < totalSlots) {
    // Sort eligible players by DS score desc
    const dsSorted = [...eligible]
      .filter((id) => dsScores.has(id) && dsScores.get(id)! > 0)
      .sort((a, b) => (dsScores.get(b) ?? 0) - (dsScores.get(a) ?? 0))

    for (const playerId of dsSorted.slice(0, 2)) {
      if (selections.length >= totalSlots) break
      selections.push({ playerId, position: selections.length + 1, reason: 'ds_top_scorer' })
      used.add(playerId)
    }
  }

  if (settings.includeBestContributor && selections.length < totalSlots) {
    // Best contributor not already used
    const contribSorted = [...eligible]
      .filter((id) => !used.has(id) && contributions.has(id) && contributions.get(id)! > 0)
      .sort((a, b) => (contributions.get(b) ?? 0) - (contributions.get(a) ?? 0))

    const best = contribSorted[0]
    if (best !== undefined) {
      selections.push({ playerId: best, position: selections.length + 1, reason: 'best_contributor' })
      used.add(best)
    }
  }

  // ── Step 3: Random fill ───────────────────────────────────────────────────
  const randomPool = [...eligible].filter((id) => !used.has(id))
  shuffle(randomPool)

  while (selections.length < totalSlots && randomPool.length > 0) {
    const playerId = randomPool.pop()!
    selections.push({ playerId, position: selections.length + 1, reason: 'random' })
  }

  return { selections, excluded }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Fisher-Yates shuffle in-place */
function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
  }
}
