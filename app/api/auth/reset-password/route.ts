import { z } from 'zod'
import { ok, fail } from '@/lib/apiResponse'
import {
  AUTH_RATE_LIMIT,
  buildRateLimitIdentifier,
  rateLimit,
  rateLimitResponse,
} from '@/lib/rateLimit'
import { completePasswordReset } from '@/server/services/userService'

const schema = z.object({
  token: z.string().min(1).max(128),
  password: z.string().min(12).max(256),
})

export async function POST(request: Request) {
  try {
    const limit = await rateLimit(
      'auth:reset-password',
      buildRateLimitIdentifier(request),
      AUTH_RATE_LIMIT,
    )
    if (!limit.ok) {
      return rateLimitResponse(limit, 'Trop de tentatives.')
    }

    const { token, password } = schema.parse(await request.json())
    await completePasswordReset(token, password)
    return ok({ message: 'Mot de passe mis a jour avec succes.' })
  } catch (err) {
    return fail(err)
  }
}
