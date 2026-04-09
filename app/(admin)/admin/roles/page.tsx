import type { Permission, UserRole } from '@/types/domain'

// Mirror of authGuard PERMISSION_MATRIX — kept in sync manually
// (can't import server-only from a server page that doesn't need the DB)
const MATRIX: Record<Permission, UserRole[]> = {
  'dashboard:view': ['super_admin', 'admin', 'manager', 'viewer'],
  'ranking:view':   ['super_admin', 'admin', 'manager', 'viewer'],
  'players:import': ['super_admin', 'admin', 'manager'],
  'scores:import':  ['super_admin', 'admin', 'manager'],
  'scores:edit':    ['super_admin', 'admin', 'manager'],
  'trains:trigger':    ['super_admin', 'admin', 'manager'],
  'trains:configure':  ['super_admin', 'admin'],
  'players:manage':    ['super_admin', 'admin'],
  'rating:configure':  ['super_admin', 'admin'],
  'rating:recalculate':['super_admin', 'admin'],
  'audit:view':        ['super_admin', 'admin'],
  'admin:view':        ['super_admin', 'admin'],
  'users:invite':      ['super_admin', 'admin'],
  'users:manage':      ['super_admin', 'admin'],
  'users:promote_admin':['super_admin'],
  'settings:configure':['super_admin'],
}

const PERMISSION_GROUPS: { label: string; permissions: Permission[] }[] = [
  {
    label: 'Navigation',
    permissions: ['dashboard:view', 'ranking:view', 'admin:view'],
  },
  {
    label: 'Imports & Scores',
    permissions: ['players:import', 'scores:import', 'scores:edit'],
  },
  {
    label: 'Trains',
    permissions: ['trains:trigger', 'trains:configure'],
  },
  {
    label: 'Joueurs & Notation',
    permissions: ['players:manage', 'rating:configure', 'rating:recalculate'],
  },
  {
    label: 'Administration',
    permissions: ['audit:view', 'users:invite', 'users:manage', 'users:promote_admin', 'settings:configure'],
  },
]

const PERMISSION_LABEL: Record<Permission, string> = {
  'dashboard:view':      'Accès dashboard',
  'ranking:view':        'Voir le classement',
  'admin:view':          'Accès espace admin',
  'players:import':      'Importer des joueurs',
  'scores:import':       'Importer des scores',
  'scores:edit':         'Éditer des scores',
  'trains:trigger':      'Déclencher sélection train',
  'trains:configure':    'Configurer les trains',
  'players:manage':      'Gérer les joueurs',
  'rating:configure':    'Configurer la notation',
  'rating:recalculate':  'Recalculer les notes',
  'audit:view':          'Voir le journal d\'audit',
  'users:invite':        'Inviter un utilisateur',
  'users:manage':        'Gérer les utilisateurs',
  'users:promote_admin': 'Promouvoir en admin/super',
  'settings:configure':  'Configurer l\'application',
}

const ROLES: UserRole[] = ['viewer', 'manager', 'admin', 'super_admin']

const ROLE_COLOR: Record<UserRole, string> = {
  viewer:      'text-[var(--color-text-muted)]',
  manager:     'text-[var(--color-info)]',
  admin:       'text-[var(--color-warning)]',
  super_admin: 'text-[var(--color-danger)]',
}

export default function RolesPage() {
  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Rôles & Droits</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
          Matrice des permissions par rôle. ✓ = autorisé, — = refusé.
        </p>
      </div>

      {/* Role descriptions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {ROLES.map((role) => (
          <div key={role} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <p className={`text-sm font-semibold capitalize ${ROLE_COLOR[role]}`}>{role.replace('_', ' ')}</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              {role === 'viewer'      && 'Lecture seule. Peut consulter le dashboard et le classement.'}
              {role === 'manager'     && 'Peut importer, éditer les scores et déclencher les trains.'}
              {role === 'admin'       && 'Gère les joueurs, la notation et peut inviter des utilisateurs.'}
              {role === 'super_admin' && 'Accès complet. Seul à pouvoir promouvoir en admin ou super_admin.'}
            </p>
          </div>
        ))}
      </div>

      {/* Permission matrix */}
      {PERMISSION_GROUPS.map((group) => (
        <div key={group.label} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-surface-raised)]">
            <h2 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">{group.label}</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="px-4 py-2 text-left text-xs text-[var(--color-text-muted)] font-normal w-64">Permission</th>
                {ROLES.map((role) => (
                  <th key={role} className={`px-4 py-2 text-center text-xs font-semibold capitalize w-28 ${ROLE_COLOR[role]}`}>
                    {role.replace('_', ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {group.permissions.map((perm) => (
                <tr key={perm} className="hover:bg-[var(--color-surface-raised)] transition-colors">
                  <td className="px-4 py-2.5 text-xs text-[var(--color-text-secondary)]">
                    <span className="font-medium text-[var(--color-text-primary)]">{PERMISSION_LABEL[perm]}</span>
                    <br />
                    <span className="font-mono text-[0.6rem] text-[var(--color-text-muted)]">{perm}</span>
                  </td>
                  {ROLES.map((role) => {
                    const allowed = MATRIX[perm].includes(role)
                    return (
                      <td key={role} className="px-4 py-2.5 text-center">
                        {allowed
                          ? <span className="text-[var(--color-success)] font-bold">✓</span>
                          : <span className="text-[var(--color-text-muted)]">—</span>
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
