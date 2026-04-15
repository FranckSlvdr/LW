import 'server-only'
import { upsertScore, upsertScoresBulk } from '@/server/repositories/scoreRepository'
import { findScoresByWeek } from '@/server/repositories/scoreRepository'
import { findWeekById } from '@/server/repositories/weekRepository'
import { upsertScoreSchema, upsertScoresBulkSchema } from '@/server/validators/scoreValidator'
import { invalidateWeekKpi } from '@/server/services/analyticsService'
import { assertWeekOpenForManualEntry } from '@/server/services/weekService'
import { NotFoundError, LockedError } from '@/lib/errors'
import type { DailyScore, ImportSource } from '@/types/domain'

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getScoresByWeek(weekId: number): Promise<DailyScore[]> {
  return findScoresByWeek(weekId)
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function upsertPlayerScore(raw: unknown): Promise<DailyScore> {
  const input = upsertScoreSchema.parse(raw)
  await assertWeekOpenForManualEntry(input.weekId)

  const result = await upsertScore(input)
  invalidateWeekKpi(input.weekId)
  return result
}

export async function upsertBulkScores(
  raw: unknown,
  source: ImportSource = 'manual',
): Promise<number> {
  const input = upsertScoresBulkSchema.parse(raw)

  const week = await findWeekById(input.weekId)
  if (!week) throw new NotFoundError('Week', input.weekId)
  if (source === 'manual') {
    await assertWeekOpenForManualEntry(input.weekId)
  } else if (week.isLocked) {
    throw new LockedError('Week')
  }

  const count = await upsertScoresBulk(input, source)
  if (count > 0) invalidateWeekKpi(input.weekId)
  return count
}
