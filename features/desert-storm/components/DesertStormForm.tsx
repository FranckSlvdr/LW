'use client'

import { useState } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { formatScore } from '@/lib/utils'
import { useI18n } from '@/lib/i18n/client'
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
  const { locale } = useI18n()
  const isFrench = locale === 'fr'
  const t = {
    saveError: isFrench ? 'Erreur lors de la sauvegarde' : 'Failed to save scores',
    unknownError: isFrench ? 'Erreur inconnue' : 'Unknown error',
    title: isFrench ? 'Saisie des scores' : 'Score entry',
    subtitle: isFrench
      ? 'Entrez les scores Desert Storm de chaque joueur pour cette semaine'
      : 'Enter each player Desert Storm score for this week',
    current: isFrench ? 'Actuel:' : 'Current:',
    saving: isFrench ? 'Sauvegarde...' : 'Saving...',
    saveAll: isFrench ? 'Sauvegarder tous les scores' : 'Save all scores',
    retry: isFrench ? 'Reessayer' : 'Retry',
    success: (count: number) => isFrench
      ? `OK ${count} score${count > 1 ? 's' : ''} sauvegarde${count > 1 ? 's' : ''}`
      : `OK ${count} score${count > 1 ? 's' : ''} saved`,
    partial: (succeeded: number, failed: number, message: string) => isFrench
      ? `${succeeded} sauvegarde${succeeded > 1 ? 's' : ''}, ${failed} erreur${failed > 1 ? 's' : ''} - ${message}`
      : `${succeeded} saved, ${failed} error${failed > 1 ? 's' : ''} - ${message}`,
  }
  const existingMap = new Map(existingScores.map((score) => [score.playerId, score.score]))
  const [entries, setEntries] = useState<Array<{ playerId: number; score: string }>>(
    players.map((player) => ({ playerId: player.id, score: String(existingMap.get(player.id) ?? '') })),
  )
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState<string | null>(null)

  function updateScore(playerId: number, value: string) {
    setEntries((prev) =>
      prev.map((entry) => (entry.playerId === playerId ? { ...entry, score: value } : entry)),
    )
  }

  async function handleSave() {
    setStatus('loading')
    setMsg(null)

    const toSave = entries.filter((entry) => entry.score.trim() !== '' && !Number.isNaN(Number(entry.score)))

    try {
      const results = await Promise.allSettled(
        toSave.map(async (entry) => {
          const res = await fetch('/api/desert-storm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId: entry.playerId, weekId, score: Number(entry.score) }),
          })
          if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error(data?.error?.message ?? `${isFrench ? 'Erreur' : 'Error'} ${res.status}`)
          }
          return res
        }),
      )

      const succeeded = results.filter((result) => result.status === 'fulfilled').length
      const failed = results.filter((result) => result.status === 'rejected')

      if (failed.length > 0) {
        const firstError = (failed[0] as PromiseRejectedResult).reason
        setStatus('error')
        setMsg(t.partial(succeeded, failed.length, firstError instanceof Error ? firstError.message : t.unknownError))
      } else {
        setStatus('done')
        setMsg(t.success(succeeded))
      }
    } catch {
      setStatus('error')
      setMsg(t.saveError)
    }
  }

  const playerMap = new Map(players.map((player) => [player.id, player]))

  return (
    <Card>
      <CardHeader title={t.title} subtitle={t.subtitle} />

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
                  <p className="text-xs text-[var(--color-text-muted)]">{t.current} {formatScore(current)}</p>
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
          {status === 'loading' ? t.saving : t.saveAll}
        </button>
        {disabled && disabledReason && (
          <span className="text-sm text-[var(--color-text-muted)]">{disabledReason}</span>
        )}
        {status === 'error' && (
          <button
            onClick={() => {
              setStatus('idle')
              setMsg(null)
            }}
            className="px-4 py-2 text-sm border border-[var(--color-border)] text-[var(--color-text-muted)] rounded-lg hover:border-[var(--color-accent)] transition-colors"
          >
            {t.retry}
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
