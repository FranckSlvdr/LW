import { ok, fail } from '@/lib/apiResponse'
import { completePasswordReset } from '@/server/services/userService'
import { z } from 'zod'

const schema = z.object({
  token:    z.string().min(1).max(128),
  password: z.string().min(12).max(256),
})

export async function POST(request: Request) {
  try {
    const { token, password } = schema.parse(await request.json())
    await completePasswordReset(token, password)
    return ok({ message: 'Mot de passe mis à jour avec succès.' })
  } catch (err) {
    return fail(err)
  }
}
