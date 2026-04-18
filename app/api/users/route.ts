import { z } from 'zod'
import { ok, created, fail } from '@/lib/apiResponse'
import {
  API_RATE_LIMIT,
  buildRateLimitIdentifier,
  rateLimit,
  rateLimitResponse,
} from '@/lib/rateLimit'
import { requireAuth } from '@/server/security/authGuard'
import { listUsers } from '@/server/repositories/userRepository'
import { inviteUser } from '@/server/services/userService'
import type { UserRole } from '@/types/domain'

const inviteSchema = z.object({
  email: z.string().email().max(256),
  name: z.string().min(1).max(100),
  role: z.enum(['admin', 'manager', 'viewer']),
})

export async function GET() {
  try {
    await requireAuth('users:manage')
    const users = await listUsers()
    return ok(users)
  } catch (err) {
    return fail(err)
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAuth('users:invite')
    const limit = await rateLimit(
      'users:invite',
      buildRateLimitIdentifier(request, actor.id),
      API_RATE_LIMIT,
    )
    if (!limit.ok) {
      return rateLimitResponse(limit)
    }

    const body = inviteSchema.parse(await request.json())
    const user = await inviteUser({
      ...body,
      role: body.role as UserRole,
      invitedBy: actor,
    })
    return created(user)
  } catch (err) {
    return fail(err)
  }
}
