import { getSessionUser } from '@/server/security/authGuard'
import { getLocale } from '@/lib/i18n/server'
import { listUsers } from '@/server/repositories/userRepository'
import { Badge } from '@/components/ui/Badge'
import { InviteForm } from './InviteForm'
import { UserActions } from './UserActions'
import type { UserRole } from '@/types/domain'
import { getAdminMessages } from '../messages'

const ROLE_BADGE: Record<UserRole, 'danger' | 'warning' | 'info' | 'neutral'> = {
  super_admin: 'danger',
  admin: 'warning',
  manager: 'info',
  viewer: 'neutral',
}

export default async function UsersPage() {
  const [locale, currentUser, users] = await Promise.all([
    getLocale(),
    getSessionUser(),
    listUsers(),
  ])

  if (!currentUser) return null

  const t = getAdminMessages(locale)
  const ui = t.users

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">{ui.title}</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{users.length} {ui.registeredAccounts}</p>
        </div>
        <InviteForm />
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-left">
              <th className="px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">{ui.user}</th>
              <th className="px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">{ui.role}</th>
              <th className="px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">{ui.status}</th>
              <th className="px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">{ui.createdAt}</th>
              <th className="px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">{ui.actions}</th>
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
                      {isSelf && (
                        <span className="ml-2 text-[0.6rem] text-[var(--color-accent)] uppercase tracking-wide border border-[var(--color-accent)]/30 rounded px-1">
                          {ui.you}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={ROLE_BADGE[u.role]}>{t.roleLabels[u.role]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {u.isActive
                      ? <Badge variant="success">{ui.active}</Badge>
                      : <Badge variant="neutral">{ui.inactive}</Badge>
                    }
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-text-muted)]">
                    {new Date(u.createdAt).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-GB')}
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

      <div className="text-xs text-[var(--color-text-muted)] space-y-1">
        <p>• {ui.roleChangeHint}</p>
        <p>• {ui.resetHint}</p>
      </div>
    </div>
  )
}
