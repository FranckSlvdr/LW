import { z } from 'zod'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/server/security/authGuard'
import { listAuditLogs } from '@/server/repositories/auditRepository'

const AUDIT_ACTIONS = ['CREATE','UPDATE','DELETE','LOGIN','LOGOUT','LOGIN_FAILED',
  'INVITE_SENT','INVITE_ACCEPTED','PASSWORD_RESET_REQUESTED','PASSWORD_RESET_COMPLETED',
  'USER_DEACTIVATED','USER_ACTIVATED','ROLE_CHANGED'] as const

const AUDIT_ENTITY_TYPES = ['player','week','daily_score','rating_rule',
  'rating_run','import','user'] as const

const querySchema = z.object({
  action:     z.enum(AUDIT_ACTIONS).optional().catch(undefined),
  entityType: z.enum(AUDIT_ENTITY_TYPES).optional().catch(undefined),
  userId:     z.string().optional(),
  limit:      z.coerce.number().int().min(1).max(200).default(50),
  offset:     z.coerce.number().int().min(0).max(1_000_000).default(0),
})

export async function GET(request: Request) {
  try {
    await requireAuth('audit:view')

    const { searchParams } = new URL(request.url)
    const q = querySchema.parse(Object.fromEntries(searchParams))

    const result = await listAuditLogs({
      action:     q.action,
      entityType: q.entityType,
      userId:     q.userId,
      limit:      q.limit,
      offset:     q.offset,
    })

    return ok(result)
  } catch (err) {
    return fail(err)
  }
}
