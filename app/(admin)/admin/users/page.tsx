import { getSessionUser } from '@/server/security/authGuard'
import { listUsers } from '@/server/repositories/userRepository'
import { Badge } from '@/components/ui/Badge'
import { InviteForm } from './InviteForm'
import { UserActions } from './UserActions'
import type { UserRole } from '@/types/domain'

const ROLE_BADGE: Record<UserRole, 'danger' | 'warning' | 'info' | 'neutral'> = {
  super_admin: 'danger',
  admin:       'warning',
  manager:     'info',
  viewer:      'neutral',
}

const ROLE_LABEL: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin:       'Admin',
  manager:     'Manager',
  viewer:      'Viewer',
}

export default async function UsersPage() {
  const [currentUser, users] = await Promise.all([
    getSessionUser(),
    listUsers(),
  ])

  if (!currentUser) return null

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Utilisateurs</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{users.length} compte{users.length > 1 ? 's' : ''} enregistré{users.length > 1 ? 's' : ''}</p>
        </div>
        <InviteForm />
      </div>

      {/* User table */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-left">
              <th className="px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Utilisateur</th>
              <th className="px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Rôle</th>
              <th className="px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Statut</th>
              <th className="px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Créé le</th>
              <th className="px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {users.map((u) => {
              const isSelf = u.id === currentUser.id
              return (
                <tr key={u.id} className={!u.isActive ? 'opacity-50' : ''}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--color-text-primary)]">
                      {u.name}
                      {isSelf && <span className="ml-2 text-[0.6rem] text-[var(--color-accent)] uppercase tracking-wide border border-[var(--color-accent)]/30 rounded px-1">vous</span>}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={ROLE_BADGE[u.role]}>{ROLE_LABEL[u.role]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {u.isActive
                      ? <Badge variant="success">Actif</Badge>
                      : <Badge variant="neutral">Inactif</Badge>
                    }
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-text-muted)]">
                    {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3">
                    <UserActions
                      userId={u.id}
                      isActive={u.isActive}
                      role={u.role}
                      isSelf={isSelf}
                      actorRole={currentUser.role}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="text-xs text-[var(--color-text-muted)] space-y-1">
        <p>• Le changement de rôle prend effet immédiatement et invalide les sessions existantes.</p>
        <p>• Forcer un reset génère un lien valable 1h. S&apos;il n&apos;y a pas de serveur SMTP configuré, le lien est affiché directement.</p>
      </div>
    </div>
  )
}
