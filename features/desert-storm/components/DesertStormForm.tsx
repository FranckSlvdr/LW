'use client'

import { useState } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { formatScore } from '@/lib/utils'
import type { PlayerApi, DesertStormScoreApi } from '@/types/api'

interface DesertStormFormProps {
  weekId: number
  players: PlayerApi[]
  existingScores: DesertStormScoreApi[]
  disabled?: boolean
  disabledReason?: string
}

export function DesertStormForm({
  weekId,
  players,
  existingScores,
  disabled = false,
  disabledReason,
}: DesertStormFormProps) {
  const existingMap  = new Map(existingScores.map((s) => [s.playerId, s.score]))
  const [entries, setEntries] = useState<Array<{ playerId: number; score: string }>>(
    players.map((p) => ({ playerId: p.id, score: String(existingMap.get(p.id) ?? '') })),
  )
  const [status, setStatus]   = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [msg, setMsg]         = useState<string | null>(null)

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
        toSave.map(async (e) => {
          const res = await fetch('/api/desert-storm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId: e.playerId, weekId, score: Number(e.score) }),
          })
          if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error(data?.error?.message ?? `Erreur ${res.status}`)
          }
          return res
        }),
      )
      const succeeded = results.filter((r) => r.status === 'fulfilled').length
      const failed    = results.filter((r) => r.status === 'rejected')
      if (failed.length > 0) {
        const firstErr = (failed[0] as PromiseRejectedResult).reason
        setStatus('error')
        setMsg(`⚠️ ${succeeded} sauvegardé${succeeded > 1 ? 's' : ''}, ${failed.length} erreur${failed.length > 1 ? 's' : ''} — ${firstErr instanceof Error ? firstErr.message : 'Erreur inconnue'}`)
      } else {
        setStatus('done')
        setMsg(`✅ ${succeeded} score${succeeded > 1 ? 's' : ''} sauvegardé${succeeded > 1 ? 's' : ''}`)
      }
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
                disabled={disabled}
                value={entry.score}
                onChange={(e) => updateScore(entry.playerId, e.target.value)}
                placeholder="0"
                className="w-28 px-2.5 py-1.5 text-sm text-right rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] tabular-nums"
              />
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex items-center gap-4 flex-wrap">
        <button
          onClick={handleSave}
          disabled={status === 'loading' || disabled}
          className="px-5 py-2 text-sm bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-40"
        >
          {status === 'loading' ? 'Sauvegarde…' : 'Sauvegarder tous les scores'}
        </button>
        {disabled && disabledReason && (
          <span className="text-sm text-[var(--color-text-muted)]">{disabledReason}</span>
        )}
        {status === 'error' && (
          <button
            onClick={() => { setStatus('idle'); setMsg(null) }}
            className="px-4 py-2 text-sm border border-[var(--color-border)] text-[var(--color-text-muted)] rounded-lg hover:border-[var(--color-accent)] transition-colors"
          >
            Réessayer
          </button>
        )}
        {msg && (
          <span className={`text-sm ${status === 'error' ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'}`}>
            {msg}
          </span>
        )}
      </div>
    </Card>
  )
}
