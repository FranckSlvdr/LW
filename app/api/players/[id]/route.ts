import { ok, fail } from '@/lib/apiResponse'
import {
  API_RATE_LIMIT,
  buildRateLimitIdentifier,
  rateLimit,
  rateLimitResponse,
} from '@/lib/rateLimit'
import { requireAuth } from '@/server/security/authGuard'
import {
  deleteExistingPlayer,
  updateExistingPlayer,
} from '@/server/services/playerService'

export async function PATCH(
  request: Request,
  context: RouteContext<'/api/players/[id]'>,
) {
  try {
    const actor = await requireAuth('players:manage')
    const limit = await rateLimit(
      'players:update',
      buildRateLimitIdentifier(request, actor.id),
      API_RATE_LIMIT,
    )
    if (!limit.ok) {
      return rateLimitResponse(limit)
    }

    const { id } = await context.params
    const body = await request.json()
    const player = await updateExistingPlayer(Number(id), body)
    return ok(player)
  } catch (err) {
    return fail(err)
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext<'/api/players/[id]'>,
) {
  try {
    const actor = await requireAuth('players:manage')
    const limit = await rateLimit(
      'players:delete',
      buildRateLimitIdentifier(request, actor.id),
      API_RATE_LIMIT,
    )
    if (!limit.ok) {
      return rateLimitResponse(limit)
    }

    const { id } = await context.params
    const result = await deleteExistingPlayer(Number(id))
    return ok(result)
  } catch (err) {
    return fail(err)
  }
}
