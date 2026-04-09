import { ok, created, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/server/security/authGuard'
import { getAllPlayers, createNewPlayer } from '@/server/services/playerService'

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
    await requireAuth('players:manage')
    const body = await request.json()
    const player = await createNewPlayer(body)
    return created(player)
  } catch (err) {
    return fail(err)
  }
}
