'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

const ACTION_OPTIONS = [
  { value: '',                          label: 'Toutes les actions' },
  { value: 'LOGIN',                     label: 'Connexion' },
  { value: 'LOGOUT',                    label: 'Déconnexion' },
  { value: 'LOGIN_FAILED',              label: 'Échec connexion' },
  { value: 'INVITE_SENT',              label: 'Invitation envoyée' },
  { value: 'INVITE_ACCEPTED',          label: 'Invitation acceptée' },
  { value: 'PASSWORD_RESET_REQUESTED', label: 'Reset demandé' },
  { value: 'PASSWORD_RESET_COMPLETED', label: 'Reset complété' },
  { value: 'USER_DEACTIVATED',         label: 'Désactivation' },
  { value: 'USER_ACTIVATED',           label: 'Activation' },
  { value: 'ROLE_CHANGED',             label: 'Changement de rôle' },
  { value: 'CREATE',                   label: 'Création (entité)' },
  { value: 'UPDATE',                   label: 'Modification (entité)' },
  { value: 'DELETE',                   label: 'Suppression (entité)' },
]

const ENTITY_OPTIONS = [
  { value: '',           label: 'Tous les types' },
  { value: 'user',       label: 'Utilisateurs' },
  { value: 'player',     label: 'Joueurs' },
  { value: 'week',       label: 'Semaines' },
  { value: 'daily_score','label': 'Scores' },
  { value: 'import',     label: 'Imports' },
]

export function AuditFilter() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentAction = searchParams.get('action') ?? ''
  const currentEntity = searchParams.get('entityType') ?? ''

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('offset')  // reset pagination on filter change
    startTransition(() => router.push(`?${params.toString()}`))
  }

  return (
    <div className={`flex gap-3 flex-wrap transition-opacity ${isPending ? 'opacity-50' : ''}`}>
      <select
        value={currentAction}
        onChange={(e) => update('action', e.target.value)}
        className="text-sm px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-accent)]"
      >
        {ACTION_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <select
        value={currentEntity}
        onChange={(e) => update('entityType', e.target.value)}
        className="text-sm px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-accent)]"
      >
        {ENTITY_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {(currentAction || currentEntity) && (
        <button
          onClick={() => startTransition(() => router.push('?'))}
          className="text-sm px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          Réinitialiser
        </button>
      )}
    </div>
  )
}
