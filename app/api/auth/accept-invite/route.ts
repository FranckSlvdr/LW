import { ok, fail } from '@/lib/apiResponse'
import { acceptUserInvite } from '@/server/services/userService'
import { buildSessionCookie } from '@/server/security/authGuard'
import { z } from 'zod'

const schema = z.object({
  token:    z.string().min(1).max(128),
  password: z.string().min(12).max(256),
})

export async function POST(request: Request) {
  try {
    const { token, password } = schema.parse(await request.json())
    const user         = await acceptUserInvite(token, password)
    const cookieHeader = await buildSessionCookie(user)
    const response = ok({ name: user.name, role: user.role })
    response.headers.set('Set-Cookie', cookieHeader)
    return response
  } catch (err) {
    return fail(err)
  }
}
