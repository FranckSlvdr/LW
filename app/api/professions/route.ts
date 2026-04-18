import { ok, created, fail } from '@/lib/apiResponse'
import { ValidationError } from '@/lib/errors'
import {
  API_RATE_LIMIT,
  buildRateLimitIdentifier,
  rateLimit,
  rateLimitResponse,
} from '@/lib/rateLimit'
import { requireAuth } from '@/server/security/authGuard'
import {
  getAllProfessions,
  removeProfession,
  setProfession,
} from '@/server/services/professionService'
import {
  deletePlayerProfessionSchema,
  upsertProfessionSchema,
} from '@/server/validators/professionValidator'

export async function GET() {
  try {
    await requireAuth('dashboard:view')
    const professions = await getAllProfessions()
    return ok(professions)
  } catch (err) {
    return fail(err)
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAuth('scores:edit')
    const limit = await rateLimit(
      'professions:upsert',
      buildRateLimitIdentifier(request, actor.id),
      API_RATE_LIMIT,
    )
    if (!limit.ok) {
      return rateLimitResponse(limit)
    }

    const body = await request.json()
    const parsed = upsertProfessionSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError('Donnees invalides', parsed.error.flatten())
    }

    const profession = await setProfession(parsed.data)
    return created(profession)
  } catch (err) {
    return fail(err)
  }
}

export async function DELETE(request: Request) {
  try {
    const actor = await requireAuth('scores:edit')
    const limit = await rateLimit(
      'professions:delete',
      buildRateLimitIdentifier(request, actor.id),
      API_RATE_LIMIT,
    )
    if (!limit.ok) {
      return rateLimitResponse(limit)
    }

    const body = await request.json()
    const parsed = deletePlayerProfessionSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError('playerId invalide', parsed.error.flatten())
    }

    await removeProfession(parsed.data.playerId)
    return ok({ deleted: true })
  } catch (err) {
    return fail(err)
  }
}
