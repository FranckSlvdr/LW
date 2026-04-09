import { getSessionUser } from '@/server/security/authGuard'
import { listUsers, countUsers } from '@/server/repositories/userRepository'
import { getRecentAuditLogs } from '@/server/repositories/auditRepository'

const ACTION_LABEL: Record<string, string> = {
  LOGIN:                       'Connexion',
  LOGOUT:                      'Déconnexion',
  LOGIN_FAILED:                'Échec de connexion',
  INVITE_SENT:                 'Invitation envoyée',
  INVITE_ACCEPTED:             'Invitation acceptée',
  PASSWORD_RESET_REQUESTED:    'Réinitialisation demandée',
  PASSWORD_RESET_COMPLETED:    'Mot de passe réinitialisé',
  USER_DEACTIVATED:            'Utilisateur désactivé',
  USER_ACTIVATED:              'Utilisateur activé',
  ROLE_CHANGED:                'Rôle modifié',
  CREATE: 'Création', UPDATE: 'Modification', DELETE: 'Suppression',
}

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
}

export default async function AdminPage() {
  const [user, users, total, recentLogs] = await Promise.all([
    getSessionUser(),
    listUsers(),
    countUsers(),
    getRecentAuditLogs(8),
  ])

  const byRole = {
    super_admin: users.filter((u) => u.role === 'super_admin').length,
    admin:       users.filter((u) => u.role === 'admin').length,
    manager:     users.filter((u) => u.role === 'manager').length,
    viewer:      users.filter((u) => u.role === 'viewer').length,
  }
  const activeCount   = users.filter((u) => u.isActive).length
  const inactiveCount = users.filter((u) => !u.isActive).length

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Administration</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
          Connecté en tant que <span className="text-[var(--color-text-secondary)]">{user?.email}</span> — rôle <span className="text-[var(--color-warning)] font-medium">{user?.role}</span>
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Utilisateurs total', value: total },
          { label: 'Actifs', value: activeCount, color: 'text-[var(--color-success)]' },
          { label: 'Inactifs', value: inactiveCount, color: inactiveCount > 0 ? 'text-[var(--color-danger)]' : '' },
          { label: 'Super admins', value: byRole.super_admin },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <p className="text-xs text-[var(--color-text-muted)]">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color ?? 'text-[var(--color-text-primary)]'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Role breakdown */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Répartition par rôle</h2>
        <div className="flex gap-6">
          {Object.entries(byRole).map(([role, count]) => (
            <div key={role} className="text-center">
              <p className="text-lg font-bold text-[var(--color-text-primary)]">{count}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5 capitalize">{role.replace('_', ' ')}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent audit events */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Activité récente</h2>
          <a href="/admin/audit" className="text-xs text-[var(--color-accent)] hover:underline">Voir tout →</a>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {recentLogs.length === 0 && (
            <p className="px-4 py-6 text-sm text-[var(--color-text-muted)] text-center">Aucun événement enregistré.</p>
          )}
          {recentLogs.map((log) => (
            <div key={log.id} className="px-4 py-2.5 flex items-center gap-3">
              <span className={`text-xs font-medium w-44 shrink-0 ${ACTION_COLOR[log.action] ?? 'text-[var(--color-text-secondary)]'}`}>
                {ACTION_LABEL[log.action] ?? log.action}
              </span>
              <span className="text-xs text-[var(--color-text-secondary)] flex-1 truncate">
                {log.userEmail ?? log.performedBy ?? '—'}
              </span>
              <span className="text-xs text-[var(--color-text-muted)] shrink-0">
                {new Date(log.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="flex gap-3 flex-wrap">
        {[
          { href: '/admin/users',    label: 'Gérer les utilisateurs' },
          { href: '/admin/roles',    label: 'Voir les droits' },
          { href: '/admin/security', label: 'Config sécurité' },
          { href: '/admin/audit',    label: 'Journal d\'audit complet' },
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
