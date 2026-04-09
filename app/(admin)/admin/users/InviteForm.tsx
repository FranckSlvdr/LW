'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export function InviteForm() {
  const [open,    setOpen]    = useState(false)
  const [email,   setEmail]   = useState('')
  const [name,    setName]    = useState('')
  const [role,    setRole]    = useState<'manager' | 'viewer' | 'admin'>('viewer')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/users', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, name, role }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error?.message ?? 'Erreur lors de l\'invitation.')
      setOpen(false)
      setEmail('')
      setName('')
      setRole('viewer')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 text-sm font-medium bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors"
      >
        + Inviter un utilisateur
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-[var(--color-accent)]/30 bg-[var(--color-surface)] p-4 space-y-3">
      <p className="text-sm font-semibold text-[var(--color-text-primary)]">Nouvel utilisateur</p>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label-xs block mb-1">Email</label>
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            autoFocus required disabled={loading}
            className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] disabled:opacity-50"
          />
        </div>
        <div>
          <label className="label-xs block mb-1">Nom</label>
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)}
            required disabled={loading}
            className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] disabled:opacity-50"
          />
        </div>
        <div>
          <label className="label-xs block mb-1">Rôle</label>
          <select
            value={role} onChange={(e) => setRole(e.target.value as typeof role)}
            disabled={loading}
            className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] disabled:opacity-50"
          >
            <option value="viewer">Viewer</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>
      {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit" disabled={loading || !email || !name}
          className="px-4 py-1.5 text-sm font-medium bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-40"
        >
          {loading ? 'Envoi…' : 'Envoyer l\'invitation'}
        </button>
        <button
          type="button" onClick={() => setOpen(false)} disabled={loading}
          className="px-4 py-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          Annuler
        </button>
      </div>
    </form>
  )
}
