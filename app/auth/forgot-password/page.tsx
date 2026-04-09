'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('')
  const [sent,    setSent]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await fetch('/api/auth/forgot-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      })
      // Always show success to prevent user enumeration
      setSent(true)
    } catch {
      setError('Une erreur est survenue. Réessayez plus tard.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--color-bg-base)] px-4">
      <div className="w-full max-w-sm space-y-6">

        <div className="text-center space-y-1">
          <p className="text-2xl font-bold text-[var(--color-text-primary)]">Mot de passe oublié</p>
          <p className="text-sm text-[var(--color-text-muted)]">Recevez un lien de réinitialisation</p>
        </div>

        {sent ? (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center space-y-3">
            <p className="text-sm text-[var(--color-text-primary)]">
              Si un compte existe pour cet email, vous recevrez un lien sous peu.
            </p>
            <Link href="/login" className="text-sm text-[var(--color-accent)] hover:underline">
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-4"
          >
            <div>
              <label className="label-xs block mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                autoComplete="email"
                disabled={loading}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] disabled:opacity-50"
              />
            </div>

            {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full py-2.5 text-sm font-semibold bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-40"
            >
              {loading ? 'Envoi…' : 'Envoyer le lien'}
            </button>

            <p className="text-center text-xs text-[var(--color-text-muted)]">
              <Link href="/login" className="hover:text-[var(--color-accent)]">
                Retour à la connexion
              </Link>
            </p>
          </form>
        )}

      </div>
    </main>
  )
}
