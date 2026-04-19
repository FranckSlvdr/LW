'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n/client'

export function TriggerRatingButton({ weekId }: { weekId: number }) {
  const { locale } = useI18n()
  const isFrench = locale === 'fr'
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState<string | null>(null)
  const router = useRouter()
  const [, startTransition] = useTransition()

  async function handle() {
    setStatus('loading')
    setMsg(null)
    try {
      const res = await fetch('/api/rating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error?.message ?? (isFrench ? 'Erreur' : 'Error'))
      setStatus('done')
      setMsg(
        isFrench
          ? `OK ${data.data.rowsComputed} joueurs classes`
          : `OK ${data.data.rowsComputed} players ranked`,
      )
      startTransition(() => router.refresh())
    } catch (err) {
      setStatus('error')
      setMsg(err instanceof Error ? err.message : (isFrench ? 'Erreur inconnue' : 'Unknown error'))
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handle}
        disabled={status === 'loading'}
        className="px-4 py-2 text-sm bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-40"
      >
        {status === 'loading'
          ? (isFrench ? 'Calcul...' : 'Computing...')
          : (isFrench ? 'Recalculer le classement' : 'Recalculate rankings')}
      </button>
      {msg && (
        <span className={`text-sm ${status === 'error' ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'}`}>
          {msg}
        </span>
      )}
    </div>
  )
}
