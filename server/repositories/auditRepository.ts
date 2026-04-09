import 'server-only'
import { db as sql } from '@/server/db/client'
import type { AuditLog, AuditAction, AuditEntityType } from '@/types/domain'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InsertAuditOpts {
  entityType: AuditEntityType
  entityId?: number | null
  action: AuditAction
  beforeJson?: Record<string, unknown> | null
  afterJson?: Record<string, unknown> | null
  performedBy?: string | null  // actor name / label
  userId?: string | null       // actor UUID (FK → users.id)
  userEmail?: string | null    // actor email (denormalized)
  ipAddress?: string | null
}

export interface AuditFilter {
  action?: AuditAction
  entityType?: AuditEntityType
  userId?: string
  limit?: number
  offset?: number
}

// ─── Row mapper ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toAuditLog(row: any): AuditLog {
  return {
    id:          row.id,
    entityType:  row.entity_type,
    entityId:    row.entity_id ?? null,
    action:      row.action,
    beforeJson:  row.before_json ?? null,
    afterJson:   row.after_json  ?? null,
    performedBy: row.performed_by ?? null,
    userId:      row.user_id    ?? null,
    userEmail:   row.user_email ?? null,
    ipAddress:   row.ip_address ?? null,
    createdAt:   row.created_at,
  }
}

// ─── Writes ───────────────────────────────────────────────────────────────────

export async function insertAuditLog(opts: InsertAuditOpts): Promise<void> {
  await sql`
    INSERT INTO audit_logs (
      entity_type, entity_id, action,
      before_json, after_json,
      performed_by, user_id, user_email, ip_address
    ) VALUES (
      ${opts.entityType},
      ${opts.entityId ?? null},
      ${opts.action},
      ${opts.beforeJson ? JSON.stringify(opts.beforeJson) : null},
      ${opts.afterJson  ? JSON.stringify(opts.afterJson)  : null},
      ${opts.performedBy ?? null},
      ${opts.userId      ?? null},
      ${opts.userEmail   ?? null},
      ${opts.ipAddress   ?? null}
    )
  `
}

// ─── Reads ────────────────────────────────────────────────────────────────────

export async function listAuditLogs(
  filter: AuditFilter = {},
): Promise<{ logs: AuditLog[]; total: number }> {
  const { action, entityType, userId, limit = 50, offset = 0 } = filter

  // Single query: window function returns total alongside each row.
  // Eliminates the second COUNT(*) round-trip and the duplicated WHERE logic.
  // idx_audit_logs_action_time / idx_audit_logs_entity_type_time support this.
  const rows = await sql`
    SELECT *, COUNT(*) OVER ()::int AS total_count
    FROM audit_logs
    WHERE TRUE
      ${action     ? sql`AND action      = ${action}`       : sql``}
      ${entityType ? sql`AND entity_type = ${entityType}`   : sql``}
      ${userId     ? sql`AND user_id     = ${userId}::uuid` : sql``}
    ORDER BY created_at DESC
    LIMIT  ${limit}
    OFFSET ${offset}
  `

  const total = (rows[0] as unknown as { total_count?: number } | undefined)?.total_count ?? 0

  return {
    logs:  rows.map(toAuditLog),
    total,
  }
}

export async function getRecentAuditLogs(limit = 10): Promise<AuditLog[]> {
  const rows = await sql`
    SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ${limit}
  `
  return rows.map(toAuditLog)
}
