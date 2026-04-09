import 'server-only'
import { db } from '@/server/db/client'
import type { TrainSettings, TrainRun, TrainSelection, TrainDay, SelectionReason } from '@/types/domain'

// ─── Row types ────────────────────────────────────────────────────────────────

interface SettingsRow {
  id: number
  exclusion_window_weeks: number
  include_ds_top2: boolean
  include_best_contributor: boolean
  total_drivers_per_day: number
  vs_top_count: number
  vs_top_days: number[] | string
  updated_at: Date
}

interface RunRow {
  id: number
  week_id: number
  train_day: number
  settings_snapshot: string | Record<string, unknown>
  excluded_player_ids: string | Array<{ playerId: number; weeksAgo: number }>
  created_at: Date
}

interface SelectionRow {
  id: number
  run_id: number
  player_id: number
  position: number
  selection_reason: string
  player_name?: string
  player_alias?: string | null
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

function toSettings(row: SettingsRow): TrainSettings {
  return {
    id:                     row.id,
    exclusionWindowWeeks:   row.exclusion_window_weeks as 0 | 1 | 2 | 3,
    includeDsTop2:          row.include_ds_top2,
    includeBestContributor: row.include_best_contributor,
    totalDriversPerDay:     row.total_drivers_per_day,
    vsTopCount:             row.vs_top_count ?? 0,
    vsTopDays:              parseJson<number[]>(row.vs_top_days ?? '[]'),
    updatedAt:              row.updated_at,
  }
}

function parseJson<T>(v: string | T): T {
  return typeof v === 'string' ? JSON.parse(v) : v
}

function toRun(row: RunRow): TrainRun {
  return {
    id:                row.id,
    weekId:            row.week_id,
    trainDay:          row.train_day as TrainDay,
    settingsSnapshot:  parseJson(row.settings_snapshot) as TrainRun['settingsSnapshot'],
    excludedPlayerIds: parseJson(row.excluded_player_ids) as TrainRun['excludedPlayerIds'],
    createdAt:         row.created_at,
  }
}

function toSelection(row: SelectionRow): TrainSelection {
  return {
    id:              row.id,
    runId:           row.run_id,
    playerId:        row.player_id,
    position:        row.position,
    selectionReason: row.selection_reason as SelectionReason,
  }
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function loadTrainSettings(): Promise<TrainSettings> {
  let [row] = await db<SettingsRow[]>`SELECT * FROM train_settings WHERE id = 1`
  if (!row) {
    // Auto-create the singleton with defaults (idempotent)
    ;[row] = await db<SettingsRow[]>`
      INSERT INTO train_settings (id, exclusion_window_weeks, include_ds_top2, include_best_contributor, total_drivers_per_day, vs_top_count, vs_top_days)
      VALUES (1, 1, TRUE, TRUE, 4, 0, '[]')
      ON CONFLICT (id) DO UPDATE SET id = 1
      RETURNING *
    `
    if (!row) throw new Error('train_settings: could not create singleton row')
  }
  return toSettings(row)
}

export async function updateTrainSettings(
  patch: Partial<Omit<TrainSettings, 'id' | 'updatedAt'>>,
): Promise<TrainSettings> {
  const [row] = await db<SettingsRow[]>`
    UPDATE train_settings SET
      exclusion_window_weeks   = COALESCE(${patch.exclusionWindowWeeks ?? null}, exclusion_window_weeks),
      include_ds_top2          = COALESCE(${patch.includeDsTop2 ?? null}, include_ds_top2),
      include_best_contributor = COALESCE(${patch.includeBestContributor ?? null}, include_best_contributor),
      total_drivers_per_day    = COALESCE(${patch.totalDriversPerDay ?? null}, total_drivers_per_day),
      vs_top_count             = COALESCE(${patch.vsTopCount ?? null}, vs_top_count),
      vs_top_days              = COALESCE(${patch.vsTopDays != null ? JSON.stringify(patch.vsTopDays) : null}, vs_top_days),
      updated_at               = NOW()
    WHERE id = 1
    RETURNING *
  `
  if (!row) throw new Error('updateTrainSettings: no row returned')
  return toSettings(row)
}

// ─── Runs ─────────────────────────────────────────────────────────────────────

export async function findTrainRunsByWeek(weekId: number): Promise<TrainRun[]> {
  const rows = await db<RunRow[]>`
    SELECT * FROM train_runs
    WHERE  week_id = ${weekId}
    ORDER  BY train_day
  `
  return rows.map(toRun)
}

export async function findTrainRunsByWeeks(weekIds: number[]): Promise<TrainRun[]> {
  if (weekIds.length === 0) return []
  const rows = await db<RunRow[]>`
    SELECT * FROM train_runs
    WHERE  week_id = ANY(${weekIds})
  `
  return rows.map(toRun)
}

export async function findRecentTrainRuns(limit = 20): Promise<TrainRun[]> {
  const rows = await db<RunRow[]>`
    SELECT * FROM train_runs
    ORDER  BY created_at DESC
    LIMIT  ${limit}
  `
  return rows.map(toRun)
}

export async function upsertTrainRun(
  weekId: number,
  trainDay: TrainDay,
  settingsSnapshot: TrainRun['settingsSnapshot'],
  excludedPlayerIds: TrainRun['excludedPlayerIds'],
): Promise<TrainRun> {
  const [row] = await db<RunRow[]>`
    INSERT INTO train_runs (week_id, train_day, settings_snapshot, excluded_player_ids, created_at)
    VALUES (
      ${weekId}, ${trainDay},
      ${JSON.stringify(settingsSnapshot)},
      ${JSON.stringify(excludedPlayerIds)},
      NOW()
    )
    ON CONFLICT (week_id, train_day)
    DO UPDATE SET
      settings_snapshot   = EXCLUDED.settings_snapshot,
      excluded_player_ids = EXCLUDED.excluded_player_ids,
      created_at          = NOW()
    RETURNING *
  `
  if (!row) throw new Error('upsertTrainRun: no row returned')
  return toRun(row)
}

// ─── Selections ───────────────────────────────────────────────────────────────

export async function findSelectionsByRun(runId: number): Promise<
  Array<TrainSelection & { playerName: string; playerAlias: string | null }>
> {
  const rows = await db<SelectionRow[]>`
    SELECT ts.*, p.name AS player_name, p.alias AS player_alias
    FROM   train_selections ts
    JOIN   players p ON p.id = ts.player_id
    WHERE  ts.run_id = ${runId}
    ORDER  BY ts.position
  `
  return rows.map((r) => ({
    ...toSelection(r),
    playerName:  r.player_name ?? '',
    playerAlias: r.player_alias ?? null,
  }))
}

export async function findSelectionsByRuns(runIds: number[]): Promise<TrainSelection[]> {
  if (runIds.length === 0) return []
  const rows = await db<SelectionRow[]>`
    SELECT * FROM train_selections WHERE run_id = ANY(${runIds})
  `
  return rows.map(toSelection)
}

export async function replaceSelectionsForRun(
  runId: number,
  selections: Array<{ playerId: number; position: number; reason: SelectionReason }>,
): Promise<void> {
  await db`DELETE FROM train_selections WHERE run_id = ${runId}`
  if (selections.length === 0) return

  const rows = selections.map((s) => ({
    run_id:           runId,
    player_id:        s.playerId,
    position:         s.position,
    selection_reason: s.reason,
  }))

  await db`
    INSERT INTO train_selections (run_id, player_id, position, selection_reason)
    ${db(rows, 'run_id', 'player_id', 'position', 'selection_reason')}
  `
}
