import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/server/security/authGuard'
import { listAuditLogs } from '@/server/repositories/auditRepository'
import type { AuditAction, AuditEntityType } from '@/types/domain'

export async function GET(request: Request) {
  try {
    await requireAuth('audit:view')

    const { searchParams } = new URL(request.url)
    const action     = searchParams.get('action')    as AuditAction | null
    const entityType = searchParams.get('entityType') as AuditEntityType | null
    const userId     = searchParams.get('userId')
    const limit      = Math.min(Number(searchParams.get('limit')  ?? 50), 200)
    const offset     = Number(searchParams.get('offset') ?? 0)

    const result = await listAuditLogs({
      action:     action     ?? undefined,
      entityType: entityType ?? undefined,
      userId:     userId     ?? undefined,
      limit,
      offset,
    })

    return ok(result)
  } catch (err) {
    return fail(err)
  }
}
