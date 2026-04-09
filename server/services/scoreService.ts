import 'server-only'
import { upsertScore, upsertScoresBulk } from '@/server/repositories/scoreRepository'
import { findScoresByWeek } from '@/server/repositories/scoreRepository'
import { findWeekById } from '@/server/repositories/weekRepository'
import { upsertScoreSchema, upsertScoresBulkSchema } from '@/server/validators/scoreValidator'
import { NotFoundError, LockedError } from '@/lib/errors'
import type { DailyScore } from '@/types/domain'

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getScoresByWeek(weekId: number): Promise<DailyScore[]> {
  return findScoresByWeek(weekId)
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function upsertPlayerScore(raw: unknown): Promise<DailyScore> {
  const input = upsertScoreSchema.parse(raw)

  const week = await findWeekById(input.weekId)
  if (!week) throw new NotFoundError('Week', input.weekId)
  if (week.isLocked) throw new LockedError('Week')

  return upsertScore(input)
}

export async function upsertBulkScores(raw: unknown): Promise<number> {
  const input = upsertScoresBulkSchema.parse(raw)

  const week = await findWeekById(input.weekId)
  if (!week) throw new NotFoundError('Week', input.weekId)
  if (week.isLocked) throw new LockedError('Week')

  return upsertScoresBulk(input)
}
