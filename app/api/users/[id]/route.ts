import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/server/security/authGuard'
import { deactivateUser, activateUser, changeUserRole } from '@/server/services/userService'
import { z } from 'zod'
import type { UserRole } from '@/types/domain'

interface Params { params: Promise<{ id: string }> }

const patchSchema = z.object({
  isActive: z.boolean().optional(),
  role:     z.enum(['super_admin', 'admin', 'manager', 'viewer']).optional(),
}).refine((d) => d.isActive !== undefined || d.role !== undefined, {
  message: 'At least one of isActive or role is required',
})

export async function PATCH(request: Request, { params }: Params) {
  try {
    const actor  = await requireAuth('users:manage')
    const { id } = await params
    const body   = patchSchema.parse(await request.json())
    const ip     = (request.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim()
    const opts   = { ipAddress: ip }

    let result
    if (body.isActive === false) {
      result = await deactivateUser(id, actor, opts)
    } else if (body.isActive === true) {
      result = await activateUser(id, actor, opts)
    } else if (body.role !== undefined) {
      // Role promotion requires a higher permission check inside changeUserRole
      result = await changeUserRole(id, body.role as UserRole, actor, opts)
    }

    return ok(result)
  } catch (err) {
    return fail(err)
  }
}
