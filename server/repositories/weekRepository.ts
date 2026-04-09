import 'server-only'
import { db } from '@/server/db/client'
import { formatWeekLabel, getWeekEnd } from '@/lib/utils'
import type { WeekRow } from '@/types/db'
import type { Week } from '@/types/domain'
import type { CreateWeekInput } from '@/server/validators/weekValidator'

// ─── Mapping ──────────────────────────────────────────────────────────────────

function toWeek(row: WeekRow): Week {
  return {
    id: row.id,
    startDate: row.start_date,
    endDate: row.end_date,
    label: row.label,
    isLocked: row.is_locked,
    createdAt: row.created_at,
  }
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function findAllWeeks(): Promise<Week[]> {
  const rows = await db<WeekRow[]>`
    SELECT * FROM weeks ORDER BY start_date DESC
  `
  return rows.map(toWeek)
}

export async function findWeekById(id: number): Promise<Week | null> {
  const rows = await db<WeekRow[]>`
    SELECT * FROM weeks WHERE id = ${id} LIMIT 1
  `
  return rows[0] ? toWeek(rows[0]) : null
}

export async function findLatestWeek(): Promise<Week | null> {
  const rows = await db<WeekRow[]>`
    SELECT * FROM weeks ORDER BY start_date DESC LIMIT 1
  `
  return rows[0] ? toWeek(rows[0]) : null
}

export async function findWeekByStartDate(startDate: string): Promise<Week | null> {
  const rows = await db<WeekRow[]>`
    SELECT * FROM weeks WHERE start_date = ${startDate} LIMIT 1
  `
  return rows[0] ? toWeek(rows[0]) : null
}

/** Returns the two most recent weeks — used for N vs N-1 comparisons */
export async function findLastTwoWeeks(): Promise<[Week, Week] | [Week] | []> {
  const rows = await db<WeekRow[]>`
    SELECT * FROM weeks ORDER BY start_date DESC LIMIT 2
  `
  return rows.map(toWeek) as [Week, Week] | [Week] | []
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createWeek(input: CreateWeekInput): Promise<Week> {
  const startDate = new Date(input.startDate)
  const endDate = getWeekEnd(startDate)
  const label = input.label ?? formatWeekLabel(startDate)

  const rows = await db<WeekRow[]>`
    INSERT INTO weeks (start_date, end_date, label)
    VALUES (${input.startDate}, ${endDate.toISOString().split('T')[0]}, ${label})
    RETURNING *
  `
  return toWeek(rows[0])
}

export async function lockWeek(id: number): Promise<boolean> {
  const rows = await db<{ id: number }[]>`
    UPDATE weeks SET is_locked = TRUE WHERE id = ${id} RETURNING id
  `
  return rows.length > 0
}
