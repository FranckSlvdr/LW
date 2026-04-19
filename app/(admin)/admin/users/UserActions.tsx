'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n/client'
import type { UserRole } from '@/types/domain'
import { getAdminMessages } from '../messages'

interface Props {
  userId: string
  isActive: boolean
  role: UserRole
  isSelf: boolean
  actorRole: UserRole
}

function assignableRoles(actorRole: UserRole): UserRole[] {
  if (actorRole === 'super_admin') return ['viewer', 'manager', 'admin', 'super_admin']
  return ['viewer', 'manager']
}

export function UserActions({ userId, isActive, role, isSelf, actorRole }: Props) {
  const { locale } = useI18n()
  const t = getAdminMessages(locale)
  const ui = t.userActions
  const [loading, setLoading] = useState(false)
  const [resetUrl, setResetUrl] = useState<string | null>(null)
  const [resetCopied, setResetCopied] = useState(false)
  const router = useRouter()

  async function patch(body: Record<string, unknown>) {
    setLoading(true)
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error?.message ?? ui.error)
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : ui.unknownError)
    } finally {
      setLoading(false)
    }
  }

  async function handleForceReset() {
    if (!confirm(ui.generateResetConfirm)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/users/${userId}/force-reset`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error?.message ?? ui.error)
      if (data.data?.resetUrl) {
        setResetUrl(data.data.resetUrl)
      } else {
        alert(ui.resetEmailSent)
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : ui.unknownError)
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

  const roleOptions = assignableRoles(actorRole)
  const canEditRole = !isSelf && roleOptions.includes(role)

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {canEditRole && (
        <select
          value={role}
          onChange={(e) => patch({ role: e.target.value })}
          disabled={loading}
          className="text-xs px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-accent)] disabled:opacity-40"
        >
          {roleOptions.map((r) => (
            <option key={r} value={r}>{t.roleLabels[r]}</option>
          ))}
        </select>
      )}

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
          {isActive ? ui.deactivate : ui.activate}
        </button>
      )}

      <button
        onClick={handleForceReset}
        disabled={loading}
        className="text-xs px-2.5 py-1 rounded border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-warning)] hover:border-[var(--color-warning)]/30 transition-colors disabled:opacity-40"
      >
        {ui.forceReset}
      </button>

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
            {resetCopied ? `${ui.copied} ✓` : ui.copy}
          </button>
          <button
            onClick={() => setResetUrl(null)}
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
