import 'server-only'
import { db } from '@/server/db/client'
import type { VsDayRow } from '@/types/db'
import type { VsDay, DayOfWeek } from '@/types/domain'

// ─── Mapping ──────────────────────────────────────────────────────────────────

function toVsDay(row: VsDayRow): VsDay {
  return {
    id: row.id,
    weekId: row.week_id,
    dayOfWeek: row.day_of_week as DayOfWeek,
    isEco: row.is_eco,
    updatedAt: row.updated_at,
  }
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function findVsDaysByWeek(weekId: number): Promise<VsDay[]> {
  const rows = await db<VsDayRow[]>`
    SELECT * FROM vs_days
    WHERE week_id = ${weekId}
    ORDER BY day_of_week ASC
  `
  return rows.map(toVsDay)
}

/**
 * Returns a Map<dayOfWeek, isEco> for efficient lookup during KPI computation.
 * Days without a vs_days record default to false (not eco).
 */
export async function findVsDaysByWeekAsMap(weekId: number): Promise<Map<DayOfWeek, boolean>> {
  const days = await findVsDaysByWeek(weekId)
  return new Map(days.map((d) => [d.dayOfWeek, d.isEco]))
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Upserts the eco flag for a specific week/day pair.
 * Creates the row if it doesn't exist, updates it if it does.
 */
export async function upsertVsDay(
  weekId: number,
  dayOfWeek: DayOfWeek,
  isEco: boolean,
): Promise<VsDay> {
  const rows = await db<VsDayRow[]>`
    INSERT INTO vs_days (week_id, day_of_week, is_eco)
    VALUES (${weekId}, ${dayOfWeek}, ${isEco})
    ON CONFLICT (week_id, day_of_week)
    DO UPDATE SET
      is_eco     = EXCLUDED.is_eco,
      updated_at = NOW()
    RETURNING *
  `
  return toVsDay(rows[0])
}
