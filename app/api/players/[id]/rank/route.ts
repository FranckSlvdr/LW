import { z } from 'zod'
import { ok, fail } from '@/lib/apiResponse'
import {
  API_RATE_LIMIT,
  buildRateLimitIdentifier,
  rateLimit,
  rateLimitResponse,
} from '@/lib/rateLimit'
import { requireAuth } from '@/server/security/authGuard'
import { updateExistingPlayer } from '@/server/services/playerService'

const rankSchema = z.object({
  currentRank: z.enum(['R1', 'R2', 'R3', 'R4', 'R5']).nullable(),
})

export async function POST(
  request: Request,
  context: RouteContext<'/api/players/[id]/rank'>,
) {
  try {
    const actor = await requireAuth('players:manage')
    const limit = await rateLimit(
      'players:update-rank',
      buildRateLimitIdentifier(request, actor.id),
      API_RATE_LIMIT,
    )
    if (!limit.ok) {
      return rateLimitResponse(limit)
    }

    const { id } = await context.params
    const { currentRank } = rankSchema.parse(await request.json())
    const player = await updateExistingPlayer(Number(id), { currentRank })
    return ok(player)
  } catch (err) {
    return fail(err)
  }
}
