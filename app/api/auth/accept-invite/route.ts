import { z } from 'zod'
import { ok, fail } from '@/lib/apiResponse'
import { buildSessionCookie } from '@/server/security/authGuard'
import {
  AUTH_RATE_LIMIT,
  buildRateLimitIdentifier,
  rateLimit,
  rateLimitResponse,
} from '@/lib/rateLimit'
import { acceptUserInvite } from '@/server/services/userService'

const schema = z.object({
  token: z.string().min(1).max(128),
  password: z.string().min(12).max(256),
})

export async function POST(request: Request) {
  try {
    const limit = await rateLimit(
      'auth:accept-invite',
      buildRateLimitIdentifier(request),
      AUTH_RATE_LIMIT,
    )
    if (!limit.ok) {
      return rateLimitResponse(limit, 'Trop de tentatives.')
    }

    const { token, password } = schema.parse(await request.json())
    const user = await acceptUserInvite(token, password)
    const cookieHeader = await buildSessionCookie(user)
    const response = ok({ name: user.name, role: user.role })
    response.headers.set('Set-Cookie', cookieHeader)
    return response
  } catch (err) {
    return fail(err)
  }
}
