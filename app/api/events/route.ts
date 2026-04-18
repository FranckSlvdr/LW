import { ok, created, fail } from '@/lib/apiResponse'
import { ValidationError } from '@/lib/errors'
import {
  API_RATE_LIMIT,
  buildRateLimitIdentifier,
  rateLimit,
  rateLimitResponse,
} from '@/lib/rateLimit'
import { requireAuth } from '@/server/security/authGuard'
import { addEvent, getAllEvents, removeEvent } from '@/server/services/eventService'
import {
  createEventSchema,
  deleteEventSchema,
} from '@/server/validators/eventValidator'

export async function GET() {
  try {
    await requireAuth('dashboard:view')
    const events = await getAllEvents()
    return ok(events)
  } catch (err) {
    return fail(err)
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAuth('scores:import')
    const limit = await rateLimit(
      'events:create',
      buildRateLimitIdentifier(request, actor.id),
      API_RATE_LIMIT,
    )
    if (!limit.ok) {
      return rateLimitResponse(limit)
    }

    const body = await request.json()
    const parsed = createEventSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError('Donnees invalides', parsed.error.flatten())
    }

    const event = await addEvent(parsed.data)
    return created(event)
  } catch (err) {
    return fail(err)
  }
}

export async function DELETE(request: Request) {
  try {
    const actor = await requireAuth('scores:import')
    const limit = await rateLimit(
      'events:delete',
      buildRateLimitIdentifier(request, actor.id),
      API_RATE_LIMIT,
    )
    if (!limit.ok) {
      return rateLimitResponse(limit)
    }

    const body = await request.json()
    const parsed = deleteEventSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError('id invalide', parsed.error.flatten())
    }

    await removeEvent(parsed.data.id)
    return ok({ deleted: true })
  } catch (err) {
    return fail(err)
  }
}
