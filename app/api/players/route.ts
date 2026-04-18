import { ok, created, fail } from '@/lib/apiResponse'
import {
  API_RATE_LIMIT,
  buildRateLimitIdentifier,
  rateLimit,
  rateLimitResponse,
} from '@/lib/rateLimit'
import { requireAuth } from '@/server/security/authGuard'
import { createNewPlayer, getAllPlayers } from '@/server/services/playerService'

export async function GET() {
  try {
    await requireAuth('dashboard:view')
    const players = await getAllPlayers()
    return ok(players)
  } catch (err) {
    return fail(err)
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAuth('players:manage')
    const limit = await rateLimit(
      'players:create',
      buildRateLimitIdentifier(request, actor.id),
      API_RATE_LIMIT,
    )
    if (!limit.ok) {
      return rateLimitResponse(limit)
    }

    const body = await request.json()
    const player = await createNewPlayer(body)
    return created(player)
  } catch (err) {
    return fail(err)
  }
}
