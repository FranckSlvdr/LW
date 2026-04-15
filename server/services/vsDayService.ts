import 'server-only'
import { findVsDaysByWeek, upsertVsDay } from '@/server/repositories/vsDayRepository'
import { findWeekById } from '@/server/repositories/weekRepository'
import { upsertVsDaySchema } from '@/server/validators/vsDayValidator'
import { invalidateWeekKpi } from '@/server/services/analyticsService'
import { NotFoundError } from '@/lib/errors'
import type { VsDayApi } from '@/types/api'
import type { VsDay, DayOfWeek } from '@/types/domain'

function toApi(day: VsDay): VsDayApi {
  return {
    id:         day.id,
    weekId:     day.weekId,
    dayOfWeek:  day.dayOfWeek,
    isEco:      day.isEco,
  }
}

export async function getVsDaysForWeek(weekId: number): Promise<VsDayApi[]> {
  return (await findVsDaysByWeek(weekId)).map(toApi)
}

export async function setVsDayEco(raw: unknown): Promise<VsDayApi> {
  const input = upsertVsDaySchema.parse(raw)

  const week = await findWeekById(input.weekId)
  if (!week) throw new NotFoundError('Week', input.weekId)

  const day = await upsertVsDay(input.weekId, input.dayOfWeek as DayOfWeek, input.isEco)
  // Eco-day flag changes affect adjusted scores → invalidate KPI snapshot
  invalidateWeekKpi(input.weekId)
  return toApi(day)
}
