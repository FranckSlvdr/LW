import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/server/security/authGuard'
import { updateExistingPlayer, deleteExistingPlayer } from '@/server/services/playerService'

interface Params { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAuth('players:manage')
    const { id } = await params
    const body   = await request.json()
    const player = await updateExistingPlayer(Number(id), body)
    return ok(player)
  } catch (err) {
    return fail(err)
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireAuth('players:manage')
    const { id } = await params
    await deleteExistingPlayer(Number(id))
    return ok({ deleted: true })
  } catch (err) {
    return fail(err)
  }
}
