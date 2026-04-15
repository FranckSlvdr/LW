import { z } from 'zod'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/server/security/authGuard'
import { updateExistingPlayer } from '@/server/services/playerService'

const rankSchema = z.object({
  currentRank: z.enum(['R1', 'R2', 'R3', 'R4', 'R5']).nullable(),
})

interface Params { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  try {
    await requireAuth('players:manage')
    const { id } = await params
    const { currentRank } = rankSchema.parse(await request.json())
    const player = await updateExistingPlayer(Number(id), { currentRank })
    return ok(player)
  } catch (err) {
    return fail(err)
  }
}
