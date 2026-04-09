import { ok, created, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/server/security/authGuard'
import { getAllEvents, addEvent, removeEvent } from '@/server/services/eventService'
import { createEventSchema, deleteEventSchema } from '@/server/validators/eventValidator'
import { ValidationError } from '@/lib/errors'

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
    await requireAuth('scores:import')
    const body = await request.json()
    const parsed = createEventSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError('Données invalides', parsed.error.flatten())
    }
    const event = await addEvent(parsed.data)
    return created(event)
  } catch (err) {
    return fail(err)
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAuth('scores:import')
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
