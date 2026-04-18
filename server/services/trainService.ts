import 'server-only'
import { unstable_cache, revalidateTag } from 'next/cache'
import { IS_VERCEL_RUNTIME, USE_NEXT_DATA_CACHE } from '@/server/config/runtime'
import {
  loadTrainSettings, updateTrainSettings,
  findTrainRunsByWeek, findRecentTrainRuns,
  upsertTrainRun, findSelectionsByRunsWithPlayers, findSelectionsByRuns,
  replaceSelectionsForRun, findTrainRunsByWeeks,
} from '@/server/repositories/trainRepository'
import { findAllPlayers } from '@/server/repositories/playerRepository'
import { findAllWeeks, findWeekById } from '@/server/repositories/weekRepository'
import { findTopDsScorers } from '@/server/repositories/desertStormRepository'
import { findTopContributors } from '@/server/repositories/contributionRepository'
import { findTopVsScorers } from '@/server/repositories/scoreRepository'
import { runTrainSelection } from '@/server/engines/trainEngine'
import { NotFoundError } from '@/lib/errors'
import { perf } from '@/lib/perf'
import type { Player, TrainSettings, TrainDay, TrainRun, SelectionReason } from '@/types/domain'
import type { TrainSettingsApi, TrainRunApi, UpdateTrainSettingsInput, TriggerTrainRunInput } from '@/types/api'

// ─── DAY_LABELS ───────────────────────────────────────────────────────────────

const DAY_LABELS: Record<number, string> = {
  1: 'Lundi', 2: 'Mardi', 3: 'Mercredi', 4: 'Jeudi',
  5: 'Vendredi', 6: 'Samedi', 7: 'Dimanche',
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getTrainSettings(): Promise<TrainSettingsApi> {
  if (IS_VERCEL_RUNTIME) return getTrainSettingsCached()
  if (!USE_NEXT_DATA_CACHE) return readTrainSettings()
  return getTrainSettingsCached()
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
  try {
    revalidateTag('train-settings', 'max')
  } catch {}
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
  if (IS_VERCEL_RUNTIME) return getTrainRunsForWeekCached(weekId)()
  if (!USE_NEXT_DATA_CACHE) return readTrainRunsForWeek(weekId)
  return getTrainRunsForWeekCached(weekId)()
}

async function readTrainRunsForWeek(weekId: number): Promise<TrainRunApi[]> {
  const done = perf('trainService.getTrainRunsForWeek')
  const [week, runs, players] = await Promise.all([
    findWeekById(weekId),
    findTrainRunsByWeek(weekId),
    findAllPlayers(),
  ])
  if (!week) throw new NotFoundError('Week', weekId)

  const selectionsByRunId = await findSelectionsByRunsWithPlayers(runs.map((r) => r.id))
  const result = runs.map((run) => enrichRun(run, week.label, players, selectionsByRunId))
  done()
  return result
}

function getTrainRunsForWeekCached(weekId: number) {
  return unstable_cache(
    async () => {
      const done = perf('trainService.getTrainRunsForWeek')
      const [week, runs, players] = await Promise.all([
        findWeekById(weekId),
        findTrainRunsByWeek(weekId),
        findAllPlayers(),
      ])
      if (!week) throw new NotFoundError('Week', weekId)
      // Batch-load all selections in one query — avoids N+1
      const selectionsByRunId = await findSelectionsByRunsWithPlayers(runs.map((r) => r.id))
      const result = runs.map((run) => enrichRun(run, week.label, players, selectionsByRunId))
      done()
      return result
    },
    ['train-runs', String(weekId)],
    { revalidate: 60, tags: ['train-runs', `train-runs-${weekId}`] },
  )
}

export async function getRecentTrainHistory(limit = 20): Promise<TrainRunApi[]> {
  if (IS_VERCEL_RUNTIME) return getRecentTrainHistoryCached(limit)()
  if (!USE_NEXT_DATA_CACHE) return readRecentTrainHistory(limit)
  return getRecentTrainHistoryCached(limit)()
}

async function readRecentTrainHistory(limit: number): Promise<TrainRunApi[]> {
  const done = perf('trainService.getRecentTrainHistory')
  const [runs, weeks, players] = await Promise.all([
    findRecentTrainRuns(limit),
    findAllWeeks(),
    findAllPlayers(),
  ])
  const weekMap = new Map(weeks.map((w) => [w.id, w.label]))
  const selectionsByRunId = await findSelectionsByRunsWithPlayers(runs.map((r) => r.id))
  const result = runs.map((run) =>
    enrichRun(run, weekMap.get(run.weekId) ?? `Week ${run.weekId}`, players, selectionsByRunId),
  )
  done()
  return result
}

function getRecentTrainHistoryCached(limit: number) {
  return unstable_cache(
    async () => {
      const done = perf('trainService.getRecentTrainHistory')
      const [runs, weeks, players] = await Promise.all([
        findRecentTrainRuns(limit),
        findAllWeeks(),
        findAllPlayers(),
      ])
      const weekMap = new Map(weeks.map((w) => [w.id, w.label]))
      // Batch-load all selections in one query — avoids N+1
      const selectionsByRunId = await findSelectionsByRunsWithPlayers(runs.map((r) => r.id))
      const result = runs.map((run) =>
        enrichRun(run, weekMap.get(run.weekId) ?? `Week ${run.weekId}`, players, selectionsByRunId),
      )
      done()
      return result
    },
    ['train-history', String(limit)],
    { revalidate: 60, tags: ['train-history', 'train-runs'] },
  )
}

/**
 * @param players - pre-fetched player list
 * @param selectionsByRunId - pre-fetched selections keyed by runId (avoids N+1)
 */
function enrichRun(
  run: TrainRun,
  weekLabel: string,
  players: Player[],
  selectionsByRunId: Map<number, Array<{ playerId: number; position: number; selectionReason: SelectionReason; playerName: string; playerAlias: string | null }>>,
): TrainRunApi {
  const selections = selectionsByRunId.get(run.id) ?? []
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

// ─── Shared setup for train triggers ─────────────────────────────────────────

interface TrainSettingsSnapshot {
  exclusionWindowWeeks:   0 | 1 | 2 | 3
  includeDsTop2:          boolean
  includeBestContributor: boolean
  totalDriversPerDay:     number
  vsTopCount:             number
  vsTopDays:              number[]
}

interface TrainContext {
  week:                 { id: number; label: string; startDate: Date }
  settings:             TrainSettings
  activePlayers:        Player[]
  allPlayers:           Player[]
  settingsSnapshot:     TrainSettingsSnapshot
  baseExcludedIds:      Set<number>
  baseExcludedWeeksAgo: Map<number, number>
  dsScores:             Map<number, number>
  contributions:        Map<number, number>
  vsEligibleIds:        Set<number>
}

async function buildTrainContext(weekId: number): Promise<TrainContext> {
  const [week, settings, allPlayers, allWeeks] = await Promise.all([
    findWeekById(weekId),
    loadTrainSettings(),
    findAllPlayers(),
    findAllWeeks(),
  ])

  if (!week) throw new NotFoundError('Week', weekId)

  const activePlayers = allPlayers.filter((p) => p.isActive)
  const sortedWeeks   = [...allWeeks].sort((a, b) => b.startDate.getTime() - a.startDate.getTime())
  const currentIdx    = sortedWeeks.findIndex((w) => w.id === weekId)
  const prevWeek      = currentIdx >= 0 ? sortedWeeks[currentIdx + 1] : undefined

  // ── Build exclusion set from previous N weeks ──────────────────────────────
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

  // ── Load external signals (DS, contributions, VS) from previous week ───────
  const prevWeekId = prevWeek?.id

  const [dsScores, contributions, rawVsScores] = await Promise.all([
    prevWeekId ? findTopDsScorers(prevWeekId, activePlayers.length) : Promise.resolve(new Map<number, number>()),
    prevWeekId ? findTopContributors(prevWeekId)                    : Promise.resolve(new Map<number, number>()),
    prevWeekId && settings.vsTopCount > 0
      ? findTopVsScorers(prevWeekId, settings.vsTopCount, settings.vsTopDays)
      : Promise.resolve(new Map<number, number>()),
  ])

  const settingsSnapshot = {
    exclusionWindowWeeks:   settings.exclusionWindowWeeks,
    includeDsTop2:          settings.includeDsTop2,
    includeBestContributor: settings.includeBestContributor,
    totalDriversPerDay:     settings.totalDriversPerDay,
    vsTopCount:             settings.vsTopCount,
    vsTopDays:              settings.vsTopDays,
  }

  return {
    week,
    settings,
    activePlayers,
    allPlayers,
    settingsSnapshot,
    baseExcludedIds,
    baseExcludedWeeksAgo,
    dsScores,
    contributions,
    vsEligibleIds: new Set(rawVsScores.keys()),
  }
}

function invalidateTrainCache(weekId: number) {
  try {
    revalidateTag('train-runs', 'max')
    revalidateTag(`train-runs-${weekId}`, 'max')
    revalidateTag('train-history', 'max')
  } catch {}
}

// ─── Trigger full week ────────────────────────────────────────────────────────

/**
 * Draws all 7 days of a week in one shot.
 * Cross-day exclusion: a player selected on day N is excluded from day N+1…7.
 */
export async function triggerFullWeekSelection(weekId: number): Promise<TrainRunApi[]> {
  const done = perf('trainService.triggerFullWeekSelection')
  const ctx  = await buildTrainContext(weekId)
  const { week, activePlayers, allPlayers, settingsSnapshot,
    baseExcludedIds, baseExcludedWeeksAgo, dsScores, contributions, vsEligibleIds } = ctx

  // Phase 1: pure computation (sequential — each day excludes previous day's picks)
  const weeklySelectedIds = new Set<number>()
  type DayPlan = { trainDay: TrainDay; result: ReturnType<typeof runTrainSelection> }
  const plans: DayPlan[] = []

  for (const trainDay of [1, 2, 3, 4, 5, 6, 7] as const) {
    const result = runTrainSelection({
      settings:                 settingsSnapshot,
      activePlayers,
      recentlySelectedIds:      new Set([...baseExcludedIds, ...weeklySelectedIds]),
      recentlySelectedWeeksAgo: new Map(baseExcludedWeeksAgo),
      dsScores,
      contributions,
      vsEligibleIds,
    })
    for (const sel of result.selections) weeklySelectedIds.add(sel.playerId)
    plans.push({ trainDay, result })
  }

  // Phase 2: upsert all 7 runs in parallel
  const runs = await Promise.all(
    plans.map(({ trainDay, result }) =>
      upsertTrainRun(weekId, trainDay, settingsSnapshot, result.excluded),
    ),
  )

  // Phase 3: replace selections for all runs in parallel
  await Promise.all(
    runs.map((run, i) =>
      replaceSelectionsForRun(
        run.id,
        plans[i].result.selections.map((s) => ({ playerId: s.playerId, position: s.position, reason: s.reason })),
      ),
    ),
  )

  // Phase 4: fetch all selections in a single batch query
  const selMap = await findSelectionsByRunsWithPlayers(runs.map((r) => r.id))
  const results = runs.map((run) => enrichRun(run, week.label, allPlayers, selMap))

  invalidateTrainCache(weekId)
  done()
  return results
}

// ─── Trigger selection ────────────────────────────────────────────────────────

export async function triggerTrainSelection(input: TriggerTrainRunInput): Promise<TrainRunApi> {
  const done = perf('trainService.triggerTrainSelection')
  const { weekId, trainDay } = input

  if (trainDay < 1 || trainDay > 7) throw new Error('trainDay must be 1–7')

  const ctx = await buildTrainContext(weekId)
  const { week, activePlayers, allPlayers, settingsSnapshot,
    baseExcludedIds, baseExcludedWeeksAgo, dsScores, contributions, vsEligibleIds } = ctx

  const result = runTrainSelection({
    settings:                 settingsSnapshot,
    activePlayers,
    recentlySelectedIds:      baseExcludedIds,
    recentlySelectedWeeksAgo: baseExcludedWeeksAgo,
    dsScores,
    contributions,
    vsEligibleIds,
  })

  const run = await upsertTrainRun(weekId, trainDay as TrainDay, settingsSnapshot, result.excluded)
  await replaceSelectionsForRun(
    run.id,
    result.selections.map((s) => ({ playerId: s.playerId, position: s.position, reason: s.reason })),
  )

  const selMap   = await findSelectionsByRunsWithPlayers([run.id])
  const enriched = enrichRun(run, week.label, allPlayers, selMap)
  invalidateTrainCache(weekId)
  done()
  return enriched
}

const getTrainSettingsCached = unstable_cache(
  () => readTrainSettings(),
  ['train-settings'],
  { revalidate: 300, tags: ['train-settings'] },
)

async function readTrainSettings(): Promise<TrainSettingsApi> {
  const s = await loadTrainSettings()
  return toSettingsApi(s)
}
