'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader } from '@/components/ui/Card'
import { formatScore } from '@/lib/utils'
import type { PlayerApi, ContributionApi } from '@/types/api'

interface ContributionFormProps {
  weekId: number
  players: PlayerApi[]
  existing: ContributionApi[]
}

export function ContributionForm({ weekId, players, existing }: ContributionFormProps) {
  const existingMap = new Map(existing.map((c) => [c.playerId, c]))
  const [entries, setEntries] = useState<Array<{ playerId: number; amount: string; note: string }>>(
    players.map((p) => ({
      playerId: p.id,
      amount:   String(existingMap.get(p.id)?.amount ?? ''),
      note:     existingMap.get(p.id)?.note ?? '',
    })),
  )
  const [status, setStatus]   = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [msg, setMsg]         = useState<string | null>(null)
  const router                = useRouter()
  const [, startTransition]   = useTransition()

  function update(playerId: number, field: 'amount' | 'note', value: string) {
    setEntries((prev) =>
      prev.map((e) => e.playerId === playerId ? { ...e, [field]: value } : e),
    )
  }

  async function handleSave() {
    setStatus('loading')
    setMsg(null)
    const toSave = entries.filter((e) => e.amount.trim() !== '' && !isNaN(Number(e.amount)))
    try {
      const results = await Promise.allSettled(
        toSave.map((e) =>
          fetch('/api/contributions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerId: e.playerId,
              weekId,
              amount: Number(e.amount),
              note:   e.note.trim() || undefined,
            }),
          }),
        ),
      )
      const ok = results.filter((r) => r.status === 'fulfilled').length
      setStatus('done')
      setMsg(`✅ ${ok} contribution${ok > 1 ? 's' : ''} sauvegardée${ok > 1 ? 's' : ''}`)
      startTransition(() => router.refresh())
    } catch {
      setStatus('error')
      setMsg('Erreur lors de la sauvegarde')
    }
  }

  const playerMap = new Map(players.map((p) => [p.id, p]))

  return (
    <Card>
      <CardHeader
        title="Saisie des contributions"
        subtitle="Montant de contribution de chaque joueur pour cette semaine"
      />

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {entries.map((entry) => {
          const player  = playerMap.get(entry.playerId)
          const current = existingMap.get(entry.playerId)
          if (!player) return null

          return (
            <div key={entry.playerId} className="flex items-start gap-3 p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)]">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{player.name}</p>
                {current && (
                  <p className="text-xs text-[var(--color-text-muted)]">Actuel : {formatScore(current.amount)}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <input
                  type="number"
                  min={0}
                  value={entry.amount}
                  onChange={(e) => update(entry.playerId, 'amount', e.target.value)}
                  placeholder="0"
                  className="w-28 px-2.5 py-1.5 text-sm text-right rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] tabular-nums"
                />
                <input
                  type="text"
                  value={entry.note}
                  onChange={(e) => update(entry.playerId, 'note', e.target.value)}
                  placeholder="Note (optionnel)"
                  className="w-28 px-2.5 py-1.5 text-xs rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={status === 'loading'}
          className="px-5 py-2 text-sm bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-40"
        >
          {status === 'loading' ? 'Sauvegarde…' : 'Sauvegarder'}
        </button>
        {msg && (
          <span className={`text-sm ${status === 'error' ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'}`}>
            {msg}
          </span>
        )}
      </div>
    </Card>
  )
}
