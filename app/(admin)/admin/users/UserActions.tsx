'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { UserRole } from '@/types/domain'

interface Props {
  userId:    string
  isActive:  boolean
  role:      UserRole
  isSelf:    boolean
  actorRole: UserRole
}

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin:       'Admin',
  manager:     'Manager',
  viewer:      'Viewer',
}

/** Roles the actor is allowed to assign. */
function assignableRoles(actorRole: UserRole): UserRole[] {
  if (actorRole === 'super_admin') return ['viewer', 'manager', 'admin', 'super_admin']
  return ['viewer', 'manager']
}

export function UserActions({ userId, isActive, role, isSelf, actorRole }: Props) {
  const [loading,     setLoading]     = useState(false)
  const [resetUrl,    setResetUrl]    = useState<string | null>(null)
  const [resetCopied, setResetCopied] = useState(false)
  const router = useRouter()

  async function patch(body: Record<string, unknown>) {
    setLoading(true)
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error?.message ?? 'Erreur')
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  async function handleForceReset() {
    if (!confirm('Générer un lien de réinitialisation pour cet utilisateur ?')) return
    setLoading(true)
    try {
      const res  = await fetch(`/api/users/${userId}/force-reset`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error?.message ?? 'Erreur')
      if (data.data?.resetUrl) {
        setResetUrl(data.data.resetUrl)
      } else {
        alert('Email de réinitialisation envoyé.')
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  async function copyResetUrl() {
    if (!resetUrl) return
    await navigator.clipboard.writeText(resetUrl)
    setResetCopied(true)
    setTimeout(() => setResetCopied(false), 2000)
  }

  // Role select is shown only when the actor can actually reassign the target's current role.
  // e.g. an admin cannot touch a super_admin or another admin.
  const roleOptions = assignableRoles(actorRole)
  const canEditRole = !isSelf && roleOptions.includes(role)

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Role selector — visible only when actor can reassign this user's role */}
      {canEditRole && (
        <select
          value={role}
          onChange={(e) => patch({ role: e.target.value })}
          disabled={loading}
          className="text-xs px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-accent)] disabled:opacity-40"
        >
          {roleOptions.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
      )}

      {/* Active toggle */}
      {!isSelf && (
        <button
          onClick={() => patch({ isActive: !isActive })}
          disabled={loading}
          className={[
            'text-xs px-2.5 py-1 rounded border transition-colors disabled:opacity-40',
            isActive
              ? 'border-[var(--color-danger)]/30 text-[var(--color-danger)] hover:bg-[var(--color-danger-dim)]'
              : 'border-[var(--color-success)]/30 text-[var(--color-success)] hover:bg-[var(--color-success-dim)]',
          ].join(' ')}
        >
          {isActive ? 'Désactiver' : 'Activer'}
        </button>
      )}

      {/* Force password reset */}
      <button
        onClick={handleForceReset}
        disabled={loading}
        className="text-xs px-2.5 py-1 rounded border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-warning)] hover:border-[var(--color-warning)]/30 transition-colors disabled:opacity-40"
      >
        Forcer reset mdp
      </button>

      {/* Reset URL display (when SMTP not configured) */}
      {resetUrl && (
        <div className="w-full mt-1 flex items-center gap-2">
          <input
            readOnly
            value={resetUrl}
            className="flex-1 text-xs px-2.5 py-1.5 rounded border border-[var(--color-warning)]/40 bg-[var(--color-warning-dim)] text-[var(--color-warning)] font-mono focus:outline-none"
          />
          <button
            onClick={copyResetUrl}
            className="text-xs px-2.5 py-1 rounded border border-[var(--color-warning)]/30 text-[var(--color-warning)] hover:bg-[var(--color-warning-dim)] transition-colors shrink-0"
          >
            {resetCopied ? 'Copié ✓' : 'Copier'}
          </button>
          <button
            onClick={() => setResetUrl(null)}
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
