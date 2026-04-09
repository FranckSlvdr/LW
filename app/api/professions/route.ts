import { ok, created, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/server/security/authGuard'
import { getAllProfessions, setProfession, removeProfession } from '@/server/services/professionService'
import { upsertProfessionSchema, deletePlayerProfessionSchema } from '@/server/validators/professionValidator'
import { ValidationError } from '@/lib/errors'

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
    await requireAuth('scores:edit')
    const body = await request.json()
    const parsed = upsertProfessionSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError('Données invalides', parsed.error.flatten())
    }
    const profession = await setProfession(parsed.data)
    return created(profession)
  } catch (err) {
    return fail(err)
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAuth('scores:edit')
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
