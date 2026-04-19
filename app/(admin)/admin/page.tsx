import { getSessionUser } from '@/server/security/authGuard'
import { getLocale } from '@/lib/i18n/server'
import { listUsers } from '@/server/repositories/userRepository'
import { getRecentAuditLogs } from '@/server/repositories/auditRepository'
import { getAdminMessages } from './messages'

const ACTION_COLOR: Record<string, string> = {
  LOGIN: 'text-[var(--color-success)]',
  LOGOUT: 'text-[var(--color-text-muted)]',
  LOGIN_FAILED: 'text-[var(--color-danger)]',
  INVITE_SENT: 'text-[var(--color-info)]',
  INVITE_ACCEPTED: 'text-[var(--color-success)]',
  PASSWORD_RESET_REQUESTED: 'text-[var(--color-warning)]',
  PASSWORD_RESET_COMPLETED: 'text-[var(--color-success)]',
  USER_DEACTIVATED: 'text-[var(--color-danger)]',
  USER_ACTIVATED: 'text-[var(--color-success)]',
  ROLE_CHANGED: 'text-[var(--color-warning)]',
}

export default async function AdminPage() {
  const [locale, user, users, recentLogs] = await Promise.all([
    getLocale(),
    getSessionUser(),
    listUsers(),
    getRecentAuditLogs(8),
  ])

  const t = getAdminMessages(locale)
  const ui = t.dashboard
  const total = users.length
  const byRole = {
    super_admin: users.filter((u) => u.role === 'super_admin').length,
    admin: users.filter((u) => u.role === 'admin').length,
    manager: users.filter((u) => u.role === 'manager').length,
    viewer: users.filter((u) => u.role === 'viewer').length,
  }
  const activeCount = users.filter((u) => u.isActive).length
  const inactiveCount = users.filter((u) => !u.isActive).length

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">{ui.title}</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
          {ui.connectedAs} <span className="text-[var(--color-text-secondary)]">{user?.email}</span> - {ui.role}{' '}
          <span className="text-[var(--color-warning)] font-medium">{user?.role}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: ui.totalUsers, value: total },
          { label: ui.active, value: activeCount, color: 'text-[var(--color-success)]' },
          { label: ui.inactive, value: inactiveCount, color: inactiveCount > 0 ? 'text-[var(--color-danger)]' : '' },
          { label: ui.superAdmins, value: byRole.super_admin },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <p className="text-xs text-[var(--color-text-muted)]">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color ?? 'text-[var(--color-text-primary)]'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">{ui.roleBreakdown}</h2>
        <div className="flex gap-6">
          {Object.entries(byRole).map(([role, count]) => (
            <div key={role} className="text-center">
              <p className="text-lg font-bold text-[var(--color-text-primary)]">{count}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5 capitalize">
                {t.roleLabels[role as keyof typeof t.roleLabels]}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{ui.recentActivity}</h2>
          <a href="/admin/audit" className="text-xs text-[var(--color-accent)] hover:underline">{ui.viewAll} →</a>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {recentLogs.length === 0 && (
            <p className="px-4 py-6 text-sm text-[var(--color-text-muted)] text-center">{ui.noEvents}</p>
          )}
          {recentLogs.map((log) => (
            <div key={log.id} className="px-4 py-2.5 flex items-center gap-3">
              <span className={`text-xs font-medium w-44 shrink-0 ${ACTION_COLOR[log.action] ?? 'text-[var(--color-text-secondary)]'}`}>
                {t.actionLabels[log.action] ?? log.action}
              </span>
              <span className="text-xs text-[var(--color-text-secondary)] flex-1 truncate">
                {log.userEmail ?? log.performedBy ?? '—'}
              </span>
              <span className="text-xs text-[var(--color-text-muted)] shrink-0">
                {new Date(log.createdAt).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-GB', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        {[
          { href: '/admin/users', label: ui.manageUsers },
          { href: '/admin/roles', label: ui.viewPermissions },
          { href: '/admin/security', label: ui.securityConfig },
          { href: '/admin/audit', label: ui.fullAuditLog },
        ].map((l) => (
          <a
            key={l.href}
            href={l.href}
            className="px-4 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-accent)]/30 transition-colors"
          >
            {l.label}
          </a>
        ))}
      </div>
    </div>
  )
}
