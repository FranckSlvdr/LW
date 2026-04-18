import { z } from 'zod'
import { ok, fail } from '@/lib/apiResponse'
import {
  AUTH_RATE_LIMIT,
  buildRateLimitIdentifier,
  rateLimit,
  rateLimitResponse,
} from '@/lib/rateLimit'
import { requestPasswordReset } from '@/server/services/userService'

const schema = z.object({
  email: z.string().email().max(256),
})

export async function POST(request: Request) {
  try {
    const limit = await rateLimit(
      'auth:forgot-password',
      buildRateLimitIdentifier(request),
      AUTH_RATE_LIMIT,
    )
    if (!limit.ok) {
      return rateLimitResponse(limit, 'Trop de tentatives.')
    }

    const { email } = schema.parse(await request.json())
    await requestPasswordReset(email)
    return ok({ message: 'Si un compte existe, un email a ete envoye.' })
  } catch (err) {
    return fail(err)
  }
}
