import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/server/security/authGuard'
import { adminForcePasswordReset } from '@/server/services/userService'

interface Params { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  try {
    const actor  = await requireAuth('users:manage')
    const { id } = await params
    const ip     = (request.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim()

    const result = await adminForcePasswordReset(id, actor, { ipAddress: ip })
    return ok(result)
  } catch (err) {
    return fail(err)
  }
}
