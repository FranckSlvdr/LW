import 'server-only'
import {
  loadTrainSettings, updateTrainSettings,
  findTrainRunsByWeek, findRecentTrainRuns,
  upsertTrainRun, findSelectionsByRun, findSelectionsByRuns,
  replaceSelectionsForRun, findTrainRunsByWeeks,
} from '@/server/repositories/trainRepository'
import { findAllPlayers } from '@/server/repositories/playerRepository'
import { findAllWeeks, findWeekById } from '@/server/repositories/weekRepository'
import { findTopDsScorers } from '@/server/repositories/desertStormRepository'
import { findTopContributors } from '@/server/repositories/contributionRepository'
import { findTopVsScorers } from '@/server/repositories/scoreRepository'
import { runTrainSelection } from '@/server/engines/trainEngine'
import { NotFoundError } from '@/lib/errors'
import type { TrainSettings, TrainDay, TrainRun } from '@/types/domain'
import type { TrainSettingsApi, TrainRunApi, UpdateTrainSettingsInput, TriggerTrainRunInput } from '@/types/api'

// ─── DAY_LABELS ───────────────────────────────────────────────────────────────

const DAY_LABELS: Record<number, string> = {
  1: 'Lundi', 2: 'Mardi', 3: 'Mercredi', 4: 'Jeudi',
  5: 'Vendredi', 6: 'Samedi', 7: 'Dimanche',
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getTrainSettings(): Promise<TrainSettingsApi> {
  const s = await loadTrainSettings()
  return toSettingsApi(s)
}

export async function patchTrainSettings(input: UpdateTrainSettingsInput): Promise<TrainSettingsApi> {
  const s = await updateTrainSettings({
    exclusionWindowWeeks:   input.exclusionWindowWeeks,
    includeDsTop2:          input.includeDsTop2,
    includeBestContributor: input.includeBestContributor,
    totalDriversPerDay:     input.totalDriversPerDay,
    vsTopCount:             input.vsTopCount,
    vsTopDays:              input.vsTopDays,
  })
  return toSettingsApi(s)
}

function toSettingsApi(s: TrainSettings): TrainSettingsApi {
  return {
    exclusionWindowWeeks:   s.exclusionWindowWeeks,
    includeDsTop2:          s.includeDsTop2,
    includeBestContributor: s.includeBestContributor,
    totalDriversPerDay:     s.totalDriversPerDay,
    vsTopCount:             s.vsTopCount,
    vsTopDays:              s.vsTopDays,
  }
}

// ─── Runs ─────────────────────────────────────────────────────────────────────

export async function getTrainRunsForWeek(weekId: number): Promise<TrainRunApi[]> {
  const week = await findWeekById(weekId)
  if (!week) throw new NotFoundError('Week', weekId)

  const runs = await findTrainRunsByWeek(weekId)
  return Promise.all(runs.map((run) => enrichRun(run, week.label)))
}

export async function getRecentTrainHistory(limit = 20): Promise<TrainRunApi[]> {
  const [runs, weeks] = await Promise.all([
    findRecentTrainRuns(limit),
    findAllWeeks(),
  ])
  const weekMap = new Map(weeks.map((w) => [w.id, w.label]))
  return Promise.all(runs.map((run) => enrichRun(run, weekMap.get(run.weekId) ?? `Week ${run.weekId}`)))
}

async function enrichRun(run: TrainRun, weekLabel: string): Promise<TrainRunApi> {
  const [selections, players] = await Promise.all([
    findSelectionsByRun(run.id),
    findAllPlayers(),
  ])
  const playerMap = new Map(players.map((p) => [p.id, p]))

  const excludedWithNames = run.excludedPlayerIds.map((e) => ({
    playerId:   e.playerId,
    playerName: playerMap.get(e.playerId)?.name ?? `Player ${e.playerId}`,
    weeksAgo:   e.weeksAgo,
  }))

  return {
    id:            run.id,
    weekId:        run.weekId,
    weekLabel,
    trainDay:      run.trainDay,
    trainDayLabel: DAY_LABELS[run.trainDay] ?? `Jour ${run.trainDay}`,
    createdAt:     run.createdAt.toISOString(),
    settings:      run.settingsSnapshot as TrainRunApi['settings'],
    excludedPlayers: excludedWithNames,
    selections: selections.map((s) => ({
      position:        s.position,
      playerId:        s.playerId,
      playerName:      (s as { playerName?: string }).playerName ?? playerMap.get(s.playerId)?.name ?? '',
      playerAlias:     (s as { playerAlias?: string | null }).playerAlias ?? playerMap.get(s.playerId)?.alias ?? null,
      selectionReason: s.selectionReason,
    })),
  }
}

// ─── Trigger full week ────────────────────────────────────────────────────────

/**
 * Draws all 7 days of a week in one shot.
 *
 * Cross-day exclusion within the same week: a player selected on Monday is
 * excluded from Tuesday through Sunday. Combined with the N-week lookback
 * (previous weeks), this ensures maximum spread across both time and days.
 */
export async function triggerFullWeekSelection(weekId: number): Promise<TrainRunApi[]> {
  const [week, settings, allPlayers, allWeeks] = await Promise.all([
    findWeekById(weekId),
    loadTrainSettings(),
    findAllPlayers(),
    findAllWeeks(),
  ])

  if (!week) throw new NotFoundError('Week', weekId)

  const activePlayers = allPlayers.filter((p) => p.isActive)

  // ── Compute previous week (used for exclusion window, DS, contributions, VS) ─
  const sortedWeeks = [...allWeeks].sort(
    (a, b) => b.startDate.getTime() - a.startDate.getTime(),
  )
  const currentIdx = sortedWeeks.findIndex((w) => w.id === weekId)
  const prevWeek   = currentIdx >= 0 ? sortedWeeks[currentIdx + 1] : undefined

  // ── Build base exclusion from previous N weeks ────────────────────────────
  const baseExcludedIds      = new Set<number>()
  const baseExcludedWeeksAgo = new Map<number, number>()

  if (settings.exclusionWindowWeeks > 0) {
    const lookbackWeeks = currentIdx >= 0
      ? sortedWeeks.slice(currentIdx + 1, currentIdx + 1 + settings.exclusionWindowWeeks)
      : []

    if (lookbackWeeks.length > 0) {
      const prevRuns       = await findTrainRunsByWeeks(lookbackWeeks.map((w) => w.id))
      const prevSelections = await findSelectionsByRuns(prevRuns.map((r) => r.id))

      for (const sel of prevSelections) {
        const run      = prevRuns.find((r) => r.id === sel.runId)
        const wIdx     = run ? lookbackWeeks.findIndex((w) => w.id === run.weekId) : -1
        const weeksAgo = wIdx + 1
        if (!baseExcludedIds.has(sel.playerId) || weeksAgo < (baseExcludedWeeksAgo.get(sel.playerId) ?? 99)) {
          baseExcludedIds.add(sel.playerId)
          baseExcludedWeeksAgo.set(sel.playerId, weeksAgo)
        }
      }
    }
  }

  // ── Load DS scores, contributions and VS filter from the previous week ────
  // If no previous week exists, maps are empty → reserved slots / filter skipped.
  const prevWeekId = prevWeek?.id

  const [dsScores, contributions, rawVsScores] = await Promise.all([
    prevWeekId ? findTopDsScorers(prevWeekId, activePlayers.length) : Promise.resolve(new Map<number, number>()),
    prevWeekId ? findTopContributors(prevWeekId)                    : Promise.resolve(new Map<number, number>()),
    prevWeekId && settings.vsTopCount > 0
      ? findTopVsScorers(prevWeekId, settings.vsTopCount, settings.vsTopDays)
      : Promise.resolve(new Map<number, number>()),
  ])

  const vsEligibleIds = new Set(rawVsScores.keys())

  const settingsSnapshot = {
    exclusionWindowWeeks:   settings.exclusionWindowWeeks,
    includeDsTop2:          settings.includeDsTop2,
    includeBestContributor: settings.includeBestContributor,
    totalDriversPerDay:     settings.totalDriversPerDay,
    vsTopCount:             settings.vsTopCount,
    vsTopDays:              settings.vsTopDays,
  }

  // ── Draw each day, accumulating within-week exclusions ────────────────────
  const weeklySelectedIds = new Set<number>() // grows as each day is drawn
  const results: TrainRunApi[] = []

  for (const trainDay of [1, 2, 3, 4, 5, 6, 7] as const) {
    // Merge previous-weeks exclusions with within-week exclusions
    const combinedExcludedIds    = new Set([...baseExcludedIds, ...weeklySelectedIds])
    const combinedExcludedWeeksAgo = new Map(baseExcludedWeeksAgo)

    const result = runTrainSelection({
      settings: settingsSnapshot,
      activePlayers,
      recentlySelectedIds:      combinedExcludedIds,
      recentlySelectedWeeksAgo: combinedExcludedWeeksAgo,
      dsScores,
      contributions,
      vsEligibleIds,
    })

    const run = await upsertTrainRun(weekId, trainDay as TrainDay, settingsSnapshot, result.excluded)
    await replaceSelectionsForRun(
      run.id,
      result.selections.map((s) => ({ playerId: s.playerId, position: s.position, reason: s.reason })),
    )

    for (const sel of result.selections) weeklySelectedIds.add(sel.playerId)

    results.push(await enrichRun(run, week.label))
  }

  return results
}

// ─── Trigger selection ────────────────────────────────────────────────────────

export async function triggerTrainSelection(input: TriggerTrainRunInput): Promise<TrainRunApi> {
  const { weekId, trainDay } = input

  if (trainDay < 1 || trainDay > 7) throw new Error('trainDay must be 1–7')

  const [week, settings, allPlayers, allWeeks] = await Promise.all([
    findWeekById(weekId),
    loadTrainSettings(),
    findAllPlayers(),
    findAllWeeks(),
  ])

  if (!week) throw new NotFoundError('Week', weekId)

  const activePlayers = allPlayers.filter((p) => p.isActive)

  // ── Compute previous week (used for exclusion window, DS, contributions, VS) ─
  const sortedWeeks = [...allWeeks].sort(
    (a, b) => b.startDate.getTime() - a.startDate.getTime(),
  )
  const currentIdx = sortedWeeks.findIndex((w) => w.id === weekId)
  const prevWeek   = currentIdx >= 0 ? sortedWeeks[currentIdx + 1] : undefined

  // ── Build exclusion set from previous N weeks ──────────────────────────────
  const recentlySelectedIds      = new Set<number>()
  const recentlySelectedWeeksAgo = new Map<number, number>()

  if (settings.exclusionWindowWeeks > 0) {
    const lookbackWeeks = currentIdx >= 0
      ? sortedWeeks.slice(currentIdx + 1, currentIdx + 1 + settings.exclusionWindowWeeks)
      : []

    if (lookbackWeeks.length > 0) {
      const prevRuns       = await findTrainRunsByWeeks(lookbackWeeks.map((w) => w.id))
      const prevSelections = await findSelectionsByRuns(prevRuns.map((r) => r.id))

      for (const sel of prevSelections) {
        const run      = prevRuns.find((r) => r.id === sel.runId)
        const wIdx     = run ? lookbackWeeks.findIndex((w) => w.id === run.weekId) : -1
        const weeksAgo = wIdx + 1

        if (!recentlySelectedIds.has(sel.playerId) || weeksAgo < (recentlySelectedWeeksAgo.get(sel.playerId) ?? 99)) {
          recentlySelectedIds.add(sel.playerId)
          recentlySelectedWeeksAgo.set(sel.playerId, weeksAgo)
        }
      }
    }
  }

  // ── Load DS scores, contributions and VS filter from the previous week ────
  // If no previous week exists, maps are empty → reserved slots / filter skipped.
  const prevWeekId = prevWeek?.id

  const [dsScores, contributions, rawVsScores] = await Promise.all([
    prevWeekId ? findTopDsScorers(prevWeekId, activePlayers.length) : Promise.resolve(new Map<number, number>()),
    prevWeekId ? findTopContributors(prevWeekId)                    : Promise.resolve(new Map<number, number>()),
    prevWeekId && settings.vsTopCount > 0
      ? findTopVsScorers(prevWeekId, settings.vsTopCount, settings.vsTopDays)
      : Promise.resolve(new Map<number, number>()),
  ])

  const vsEligibleIds = new Set(rawVsScores.keys())

  const settingsSnapshot = {
    exclusionWindowWeeks:   settings.exclusionWindowWeeks,
    includeDsTop2:          settings.includeDsTop2,
    includeBestContributor: settings.includeBestContributor,
    totalDriversPerDay:     settings.totalDriversPerDay,
    vsTopCount:             settings.vsTopCount,
    vsTopDays:              settings.vsTopDays,
  }

  // ── Run the engine ─────────────────────────────────────────────────────────
  const result = runTrainSelection({
    settings: settingsSnapshot,
    activePlayers,
    recentlySelectedIds,
    recentlySelectedWeeksAgo,
    dsScores,
    contributions,
    vsEligibleIds,
  })

  // ── Persist run + selections ───────────────────────────────────────────────

  const run = await upsertTrainRun(
    weekId,
    trainDay as TrainDay,
    settingsSnapshot,
    result.excluded,
  )

  await replaceSelectionsForRun(
    run.id,
    result.selections.map((s) => ({
      playerId: s.playerId,
      position: s.position,
      reason:   s.reason,
    })),
  )

  return enrichRun(run, week.label)
}
