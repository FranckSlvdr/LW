'use client'

import { useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n/client'
import { getAuthMessages } from '@/app/auth/messages'

export default function ResetPasswordPage() {
  const { locale } = useI18n()
  const t = getAuthMessages(locale).resetPassword
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError(t.mismatch)
      return
    }
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error?.message ?? t.resetError)
      }
      setDone(true)
      setTimeout(() => router.push('/login'), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.unknownError)
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[var(--color-bg-base)] px-4">
        <div className="text-center space-y-2">
          <p className="text-[var(--color-danger)]">{t.invalidLink}</p>
          <Link href="/auth/forgot-password" className="text-sm text-[var(--color-accent)] hover:underline">
            {t.requestNewLink}
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--color-bg-base)] px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <p className="text-2xl font-bold text-[var(--color-text-primary)]">{t.title}</p>
          <p className="text-sm text-[var(--color-text-muted)]">{t.subtitle}</p>
        </div>

        {done ? (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center">
            <p className="text-sm text-[var(--color-text-primary)]">{t.success}</p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-4"
          >
            <div>
              <label className="label-xs block mb-1.5">{t.password}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                autoComplete="new-password"
                disabled={loading}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] disabled:opacity-50"
              />
            </div>
            <div>
              <label className="label-xs block mb-1.5">{t.confirmPassword}</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                disabled={loading}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] disabled:opacity-50"
              />
            </div>

            {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

            <button
              type="submit"
              disabled={loading || password.length < 12 || !confirm}
              className="w-full py-2.5 text-sm font-semibold bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-40"
            >
              {loading ? t.loading : t.submit}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
