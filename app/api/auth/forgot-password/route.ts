import { ok, fail } from '@/lib/apiResponse'
import { requestPasswordReset } from '@/server/services/userService'
import { rateLimit, AUTH_RATE_LIMIT } from '@/lib/rateLimit'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({ email: z.string().email().max(256) })

export async function POST(request: Request) {
  try {
    const ip    = (request.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim()
    const limit = await rateLimit('forgot-password', ip, AUTH_RATE_LIMIT)
    if (!limit.ok) {
      return NextResponse.json(
        { success: false, error: { code: 'RATE_LIMITED', message: 'Trop de tentatives.' } },
        { status: 429 },
      )
    }

    const { email } = schema.parse(await request.json())
    // Always succeed (no user enumeration)
    await requestPasswordReset(email)
    return ok({ message: 'Si un compte existe, un email a été envoyé.' })
  } catch (err) {
    return fail(err)
  }
}
