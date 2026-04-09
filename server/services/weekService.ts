import 'server-only'
import {
  findAllWeeks,
  findWeekById,
  findWeekByStartDate,
  findLatestWeek,
  createWeek,
} from '@/server/repositories/weekRepository'
import { createWeekSchema } from '@/server/validators/weekValidator'
import { NotFoundError, ConflictError, BadRequestError } from '@/lib/errors'
import { isMonday } from '@/lib/utils'
import type { Week } from '@/types/domain'
import type { WeekApi } from '@/types/api'

// ─── Mapping ──────────────────────────────────────────────────────────────────

export function toWeekApi(week: Week): WeekApi {
  return {
    id: week.id,
    startDate: week.startDate.toISOString().split('T')[0],
    endDate: week.endDate.toISOString().split('T')[0],
    label: week.label,
    isLocked: week.isLocked,
  }
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getAllWeeks(): Promise<WeekApi[]> {
  const weeks = await findAllWeeks()
  return weeks.map(toWeekApi)
}

export async function getWeekById(id: number): Promise<WeekApi> {
  const week = await findWeekById(id)
  if (!week) throw new NotFoundError('Week', id)
  return toWeekApi(week)
}

export async function getLatestWeek(): Promise<WeekApi | null> {
  const week = await findLatestWeek()
  return week ? toWeekApi(week) : null
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createNewWeek(raw: unknown): Promise<WeekApi> {
  const input = createWeekSchema.parse(raw)

  // Business rule: a VS week must start on Monday
  const start = new Date(input.startDate)
  if (!isMonday(start)) {
    throw new BadRequestError(
      `La date de début doit être un lundi. "${input.startDate}" est un ${start.toLocaleDateString('fr-FR', { weekday: 'long' })}.`,
    )
  }

  const existing = await findWeekByStartDate(input.startDate)
  if (existing) {
    throw new ConflictError(
      `Une semaine débutant le ${input.startDate} existe déjà (id: ${existing.id}).`,
    )
  }

  const week = await createWeek(input)
  return toWeekApi(week)
}
