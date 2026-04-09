import 'server-only'
import { db } from '@/server/db/client'
import type { EventParticipationRow } from '@/types/db'
import type { EventParticipation } from '@/types/domain'
import { bigintToNumber } from '@/lib/utils'

// ─── Mapping ──────────────────────────────────────────────────────────────────

function toEvent(row: EventParticipationRow): EventParticipation {
  return {
    id:          row.id,
    playerId:    row.player_id,
    eventName:   row.event_name,
    eventDate:   row.event_date,
    score:       bigintToNumber(row.score, 'event_participation.score'),
    participated: row.participated,
    createdAt:   row.created_at,
  }
}

// ─── Queries ─────────────────────────────────────────────────────────────────

/** All events for a date range (used to compute event scores for a VS week) */
export async function findEventsByDateRange(
  startDate: Date,
  endDate: Date,
): Promise<EventParticipation[]> {
  const rows = await db<EventParticipationRow[]>`
    SELECT * FROM event_participation
    WHERE event_date >= ${startDate} AND event_date <= ${endDate}
    ORDER BY event_date ASC, player_id ASC
  `
  return rows.map(toEvent)
}

/** All events for a specific player */
export async function findEventsByPlayer(playerId: number): Promise<EventParticipation[]> {
  const rows = await db<EventParticipationRow[]>`
    SELECT * FROM event_participation
    WHERE player_id = ${playerId}
    ORDER BY event_date DESC
  `
  return rows.map(toEvent)
}

/** All events, joined with player name for display */
export async function findAllEventsWithPlayerName(): Promise<
  Array<EventParticipation & { playerName: string }>
> {
  const rows = await db<Array<EventParticipationRow & { player_name: string }>>`
    SELECT ep.*, p.name AS player_name
    FROM event_participation ep
    JOIN players p ON p.id = ep.player_id
    ORDER BY ep.event_date DESC, ep.player_id ASC
  `
  return rows.map((r) => ({ ...toEvent(r), playerName: r.player_name }))
}

export async function createEvent(data: {
  playerId: number
  eventName: string
  eventDate: Date
  score: number
  participated?: boolean
}): Promise<EventParticipation> {
  const rows = await db<EventParticipationRow[]>`
    INSERT INTO event_participation (player_id, event_name, event_date, score, participated)
    VALUES (
      ${data.playerId},
      ${data.eventName},
      ${data.eventDate},
      ${data.score},
      ${data.participated ?? true}
    )
    RETURNING *
  `
  return toEvent(rows[0])
}

export async function deleteEvent(id: number): Promise<boolean> {
  const result = await db`
    DELETE FROM event_participation WHERE id = ${id}
  `
  return result.count > 0
}

/**
 * Aggregates total event scores per player for a date range.
 * Returns a Map<playerId, totalScore> — players with no events are absent from the map.
 */
export async function aggregateEventScoresByDateRange(
  startDate: Date,
  endDate: Date,
): Promise<Map<number, number>> {
  const rows = await db<Array<{ player_id: number; total: string }>>`
    SELECT player_id, SUM(score) AS total
    FROM event_participation
    WHERE event_date >= ${startDate}
      AND event_date <= ${endDate}
      AND participated = TRUE
    GROUP BY player_id
  `
  const map = new Map<number, number>()
  for (const r of rows) {
    map.set(r.player_id, bigintToNumber(r.total, 'event_participation.score (sum)'))
  }
  return map
}
