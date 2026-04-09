import { listAuditLogs } from '@/server/repositories/auditRepository'
import { AuditFilter } from './AuditFilter'
import type { AuditAction, AuditEntityType } from '@/types/domain'

const ACTION_COLOR: Record<string, string> = {
  LOGIN:                    'text-[var(--color-success)]',
  LOGOUT:                   'text-[var(--color-text-muted)]',
  LOGIN_FAILED:             'text-[var(--color-danger)]',
  INVITE_SENT:              'text-[var(--color-info)]',
  INVITE_ACCEPTED:          'text-[var(--color-success)]',
  PASSWORD_RESET_REQUESTED: 'text-[var(--color-warning)]',
  PASSWORD_RESET_COMPLETED: 'text-[var(--color-success)]',
  USER_DEACTIVATED:         'text-[var(--color-danger)]',
  USER_ACTIVATED:           'text-[var(--color-success)]',
  ROLE_CHANGED:             'text-[var(--color-warning)]',
  CREATE:  'text-[var(--color-info)]',
  UPDATE:  'text-[var(--color-warning)]',
  DELETE:  'text-[var(--color-danger)]',
}

const PAGE_SIZE = 50

interface Props {
  searchParams: Promise<Record<string, string>>
}

export default async function AuditPage({ searchParams }: Props) {
  const params     = await searchParams
  const action     = params.action     as AuditAction     | undefined
  const entityType = params.entityType as AuditEntityType | undefined
  const offset     = Number(params.offset ?? 0)

  const { logs, total } = await listAuditLogs({
    action,
    entityType,
    limit:  PAGE_SIZE,
    offset,
  })

  const totalPages   = Math.ceil(total / PAGE_SIZE)
  const currentPage  = Math.floor(offset / PAGE_SIZE) + 1

  function pageUrl(page: number) {
    const p = new URLSearchParams(params)
    p.set('offset', String((page - 1) * PAGE_SIZE))
    return `?${p.toString()}`
  }

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Journal d&apos;audit</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{total} événement{total > 1 ? 's' : ''} enregistré{total > 1 ? 's' : ''}</p>
      </div>

      {/* Filters (client component) */}
      <AuditFilter />

      {/* Table */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-left">
              <th className="px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide w-44">Action</th>
              <th className="px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Acteur</th>
              <th className="px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide w-24">Type</th>
              <th className="px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Contexte</th>
              <th className="px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide w-36">IP</th>
              <th className="px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide w-36">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {logs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-[var(--color-text-muted)]">
                  Aucun événement correspondant.
                </td>
              </tr>
            )}
            {logs.map((log) => {
              const ctx = log.afterJson as Record<string, string> | null
              const contextStr = ctx
                ? Object.entries(ctx)
                    .filter(([k]) => !['userId', 'targetUserId'].includes(k))
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(' · ')
                : null

              return (
                <tr key={log.id} className="hover:bg-[var(--color-surface-raised)] transition-colors">
                  <td className="px-4 py-2.5">
                    <span className={`text-xs font-medium ${ACTION_COLOR[log.action] ?? 'text-[var(--color-text-secondary)]'}`}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[var(--color-text-secondary)]">
                    {log.userEmail ?? log.performedBy ?? <span className="text-[var(--color-text-muted)]">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[var(--color-text-muted)]">
                    {log.entityType}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[var(--color-text-muted)] max-w-xs truncate">
                    {contextStr ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[var(--color-text-muted)] font-mono">
                    {log.ipAddress ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[var(--color-text-muted)]">
                    {new Date(log.createdAt).toLocaleString('fr-FR', {
                      day: '2-digit', month: '2-digit', year: '2-digit',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          {currentPage > 1 && (
            <a
              href={pageUrl(currentPage - 1)}
              className="px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-accent)]/30 transition-colors"
            >
              ← Précédent
            </a>
          )}
          <span className="text-xs text-[var(--color-text-muted)]">
            Page {currentPage} / {totalPages}
          </span>
          {currentPage < totalPages && (
            <a
              href={pageUrl(currentPage + 1)}
              className="px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-accent)]/30 transition-colors"
            >
              Suivant →
            </a>
          )}
        </div>
      )}
    </div>
  )
}
