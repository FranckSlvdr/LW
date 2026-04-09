import 'server-only'
import {
  findAllEventsWithPlayerName,
  findEventsByPlayer,
  createEvent,
  deleteEvent,
} from '@/server/repositories/eventRepository'
import { findPlayerById } from '@/server/repositories/playerRepository'
import { NotFoundError } from '@/lib/errors'
import type { EventApi, CreateEventInput } from '@/types/api'

function toEventApi(
  event: { id: number; playerId: number; eventName: string; eventDate: Date; score: number; participated: boolean },
  playerName: string,
): EventApi {
  return {
    id:          event.id,
    playerId:    event.playerId,
    playerName,
    eventName:   event.eventName,
    eventDate:   event.eventDate.toISOString().split('T')[0]!,
    score:       event.score,
    participated: event.participated,
  }
}

export async function getAllEvents(): Promise<EventApi[]> {
  const rows = await findAllEventsWithPlayerName()
  return rows.map((r) => toEventApi(r, r.playerName))
}

export async function getEventsForPlayer(playerId: number): Promise<EventApi[]> {
  const player = await findPlayerById(playerId)
  if (!player) throw new NotFoundError(`Player ${playerId} not found`)
  const rows = await findEventsByPlayer(playerId)
  return rows.map((r) => toEventApi(r, player.name))
}

export async function addEvent(input: CreateEventInput): Promise<EventApi> {
  const player = await findPlayerById(input.playerId)
  if (!player) throw new NotFoundError(`Player ${input.playerId} not found`)

  const event = await createEvent({
    playerId:     input.playerId,
    eventName:    input.eventName,
    eventDate:    new Date(input.eventDate),
    score:        input.score,
    participated: input.participated ?? true,
  })

  return toEventApi(event, player.name)
}

export async function removeEvent(id: number): Promise<void> {
  const deleted = await deleteEvent(id)
  if (!deleted) throw new NotFoundError(`Event ${id} not found`)
}
