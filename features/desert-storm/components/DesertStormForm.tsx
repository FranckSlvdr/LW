'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader } from '@/components/ui/Card'
import { formatScore } from '@/lib/utils'
import type { PlayerApi, DesertStormScoreApi } from '@/types/api'

interface DesertStormFormProps {
  weekId: number
  players: PlayerApi[]
  existingScores: DesertStormScoreApi[]
}

export function DesertStormForm({ weekId, players, existingScores }: DesertStormFormProps) {
  const existingMap  = new Map(existingScores.map((s) => [s.playerId, s.score]))
  const [entries, setEntries] = useState<Array<{ playerId: number; score: string }>>(
    players.map((p) => ({ playerId: p.id, score: String(existingMap.get(p.id) ?? '') })),
  )
  const [status, setStatus]   = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [msg, setMsg]         = useState<string | null>(null)
  const router                = useRouter()
  const [, startTransition]   = useTransition()

  function updateScore(playerId: number, value: string) {
    setEntries((prev) =>
      prev.map((e) => e.playerId === playerId ? { ...e, score: value } : e),
    )
  }

  async function handleSave() {
    setStatus('loading')
    setMsg(null)

    const toSave = entries.filter((e) => e.score.trim() !== '' && !isNaN(Number(e.score)))

    try {
      const results = await Promise.allSettled(
        toSave.map((e) =>
          fetch('/api/desert-storm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId: e.playerId, weekId, score: Number(e.score) }),
          }),
        ),
      )
      const ok = results.filter((r) => r.status === 'fulfilled').length
      setStatus('done')
      setMsg(`✅ ${ok} score${ok > 1 ? 's' : ''} sauvegardé${ok > 1 ? 's' : ''}`)
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
        title="Saisie des scores"
        subtitle="Entrez les scores Desert Storm de chaque joueur pour cette semaine"
      />

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {entries.map((entry) => {
          const player = playerMap.get(entry.playerId)
          if (!player) return null
          const current = existingMap.get(entry.playerId)

          return (
            <div key={entry.playerId} className="flex items-center gap-3 p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)]">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{player.name}</p>
                {current !== undefined && (
                  <p className="text-xs text-[var(--color-text-muted)]">Actuel : {formatScore(current)}</p>
                )}
              </div>
              <input
                type="number"
                min={0}
                value={entry.score}
                onChange={(e) => updateScore(entry.playerId, e.target.value)}
                placeholder="0"
                className="w-28 px-2.5 py-1.5 text-sm text-right rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] tabular-nums"
              />
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
          {status === 'loading' ? 'Sauvegarde…' : 'Sauvegarder tous les scores'}
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
