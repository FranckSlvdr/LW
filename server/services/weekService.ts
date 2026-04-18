import 'server-only'
import { unstable_cache, revalidateTag } from 'next/cache'
import { IS_VERCEL_RUNTIME, USE_NEXT_DATA_CACHE } from '@/server/config/runtime'
import {
  findAllWeeks,
  findWeekById,
  findWeekByStartDate,
  findLatestWeek,
  createWeek,
  lockWeek,
} from '@/server/repositories/weekRepository'
import { createWeekSchema } from '@/server/validators/weekValidator'
import { NotFoundError, ConflictError, BadRequestError, AppError } from '@/lib/errors'
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

// Weeks change at most once a week. Cache for 5 min, invalidated on creation.
const getAllWeeksCached = unstable_cache(
  async () => {
    const weeks = await findAllWeeks()
    return weeks.map(toWeekApi)
  },
  ['all-weeks'],
  { revalidate: 300, tags: ['weeks'] },
)

export async function getAllWeeks(): Promise<WeekApi[]> {
  if (IS_VERCEL_RUNTIME) {
    return getAllWeeksCached()
  }

  if (!USE_NEXT_DATA_CACHE) {
    const weeks = await findAllWeeks()
    return weeks.map(toWeekApi)
  }

  return getAllWeeksCached()
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

export async function assertWeekOpenForManualEntry(weekId: number): Promise<WeekApi> {
  const week = await findWeekById(weekId)

  if (!week) throw new NotFoundError('Week', weekId)
  if (week.isLocked) {
    throw new AppError(
      'Cette semaine est verrouillee. Les saisies manuelles sont desactivees.',
      'WEEK_LOCKED',
      423,
    )
  }

  return toWeekApi(week)
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
  try {
    revalidateTag('weeks', 'max')
  } catch {
    // revalidateTag can throw outside a full Next.js render context
  }
  return toWeekApi(week)
}

export async function lockExistingWeek(id: number, isLocked: boolean): Promise<WeekApi> {
  const week = await findWeekById(id)
  if (!week) throw new NotFoundError('Week', id)
  await lockWeek(id, isLocked)
  try {
    revalidateTag('weeks', 'max')
  } catch {
    // no-op outside render context
  }
  return toWeekApi({ ...week, isLocked })
}
