import { getLocale } from '@/lib/i18n/server'
import type { Permission, UserRole } from '@/types/domain'
import { getAdminMessages } from '../messages'

const MATRIX: Record<Permission, UserRole[]> = {
  'dashboard:view': ['super_admin', 'admin', 'manager', 'viewer'],
  'players:import': ['super_admin', 'admin', 'manager'],
  'scores:import': ['super_admin', 'admin', 'manager'],
  'weeks:manage': ['super_admin', 'admin'],
  'scores:edit': ['super_admin', 'admin', 'manager'],
  'trains:trigger': ['super_admin', 'admin', 'manager'],
  'trains:configure': ['super_admin', 'admin', 'manager'],
  'players:manage': ['super_admin', 'admin', 'manager'],
  'rating:configure': ['super_admin', 'admin', 'manager'],
  'rating:recalculate': ['super_admin', 'admin', 'manager'],
  'audit:view': ['super_admin', 'admin'],
  'admin:view': ['super_admin', 'admin'],
  'users:invite': ['super_admin', 'admin'],
  'users:manage': ['super_admin', 'admin'],
  'users:promote_admin': ['super_admin'],
  'settings:configure': ['super_admin'],
}

const PERMISSION_GROUPS: { key: string; permissions: Permission[] }[] = [
  { key: 'navigation', permissions: ['dashboard:view', 'admin:view'] },
  { key: 'imports', permissions: ['players:import', 'scores:import', 'scores:edit'] },
  { key: 'weeks', permissions: ['weeks:manage'] },
  { key: 'trains', permissions: ['trains:trigger', 'trains:configure'] },
  { key: 'players', permissions: ['players:manage', 'rating:configure', 'rating:recalculate'] },
  { key: 'admin', permissions: ['audit:view', 'users:invite', 'users:manage', 'users:promote_admin', 'settings:configure'] },
]

const ROLES: UserRole[] = ['viewer', 'manager', 'admin', 'super_admin']

const ROLE_COLOR: Record<UserRole, string> = {
  viewer: 'text-[var(--color-text-muted)]',
  manager: 'text-[var(--color-info)]',
  admin: 'text-[var(--color-warning)]',
  super_admin: 'text-[var(--color-danger)]',
}

export default async function RolesPage() {
  const locale = await getLocale()
  const t = getAdminMessages(locale)
  const ui = t.roles

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">{ui.title}</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{ui.subtitle}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {ROLES.map((role) => (
          <div key={role} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <p className={`text-sm font-semibold capitalize ${ROLE_COLOR[role]}`}>{t.roleLabels[role]}</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              {role === 'viewer' && ui.viewerDescription}
              {role === 'manager' && ui.managerDescription}
              {role === 'admin' && ui.adminDescription}
              {role === 'super_admin' && ui.superAdminDescription}
            </p>
          </div>
        ))}
      </div>

      {PERMISSION_GROUPS.map((group) => (
        <div key={group.key} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-surface-raised)]">
            <h2 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
              {t.permissionGroupLabels[group.key]}
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="px-4 py-2 text-left text-xs text-[var(--color-text-muted)] font-normal w-64">{ui.permission}</th>
                {ROLES.map((role) => (
                  <th key={role} className={`px-4 py-2 text-center text-xs font-semibold capitalize w-28 ${ROLE_COLOR[role]}`}>
                    {t.roleLabels[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {group.permissions.map((perm) => (
                <tr key={perm} className="hover:bg-[var(--color-surface-raised)] transition-colors">
                  <td className="px-4 py-2.5 text-xs text-[var(--color-text-secondary)]">
                    <span className="font-medium text-[var(--color-text-primary)]">{t.permissionLabels[perm]}</span>
                    <br />
                    <span className="font-mono text-[0.6rem] text-[var(--color-text-muted)]">{perm}</span>
                  </td>
                  {ROLES.map((role) => {
                    const allowed = MATRIX[perm].includes(role)
                    return (
                      <td key={role} className="px-4 py-2.5 text-center">
                        {allowed
                          ? <span className="text-[var(--color-success)] font-bold">{ui.yes}</span>
                          : <span className="text-[var(--color-text-muted)]">{ui.no}</span>
                        }
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
