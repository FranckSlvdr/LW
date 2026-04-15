'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader } from '@/components/ui/Card'
import { formatScore } from '@/lib/utils'
import type { PlayerApi } from '@/types/api'
import type { VsDayApi } from '@/types/api'

const DAY_LABELS: Record<number, string> = {
  1: 'Lundi', 2: 'Mardi', 3: 'Mercredi',
  4: 'Jeudi', 5: 'Vendredi', 6: 'Samedi',
}

const ECO_SCORE_CAP = 7_200_000

interface ExistingScore {
  playerId:  number
  dayOfWeek: number
  score:     number
}

interface DailyScoresFormProps {
  weekId:         number
  weekLabel:      string
  players:        PlayerApi[]
  existingScores: ExistingScore[]
  ecoDays?:       VsDayApi[]
  disabled?:      boolean
  disabledReason?: string
}

export function DailyScoresForm({
  weekId,
  weekLabel,
  players,
  existingScores,
  ecoDays = [],
  disabled = false,
  disabledReason,
}: DailyScoresFormProps) {
  // Build a lookup: `${playerId}:${dayOfWeek}` → score string
  const existingMap = new Map(existingScores.map((s) => [`${s.playerId}:${s.dayOfWeek}`, s.score]))
  const ecoSet = new Set<number>(ecoDays.filter((d) => d.isEco).map((d) => d.dayOfWeek as number))

  const [selectedDay, setSelectedDay] = useState<number>(1)
  // All scores for all days are kept in state so switching days doesn't lose unsaved edits
  const [inputs, setInputs] = useState<Record<string, string>>(
    () => Object.fromEntries(
      players.flatMap((p) =>
        [1, 2, 3, 4, 5, 6].map((day) => {
          const existing = existingMap.get(`${p.id}:${day}`)
          return [`${p.id}:${day}`, existing !== undefined ? String(existing) : '']
        }),
      ),
    ),
  )

  const [status, setStatus]   = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [msg, setMsg]         = useState<string | null>(null)
  const router                = useRouter()
  const [, startTransition]   = useTransition()

  function updateInput(playerId: number, day: number, value: string) {
    setInputs((prev) => ({ ...prev, [`${playerId}:${day}`]: value }))
  }

  async function handleSave() {
    setStatus('loading')
    setMsg(null)

    const toSave = players
      .map((p) => ({
        playerId:   p.id,
        dayOfWeek:  selectedDay,
        score:      Number(inputs[`${p.id}:${selectedDay}`]),
      }))
      .filter((e) => {
        const raw = inputs[`${e.playerId}:${selectedDay}`]
        return raw !== undefined && raw.trim() !== '' && !isNaN(e.score) && e.score >= 0
      })

    if (toSave.length === 0) {
      setStatus('idle')
      setMsg('Aucun score à sauvegarder')
      return
    }

    try {
      const res  = await fetch('/api/scores', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ weekId, scores: toSave }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error?.message ?? 'Erreur')
      const count = data.data?.count ?? toSave.length
      setStatus('done')
      setMsg(`✅ ${count} score${count > 1 ? 's' : ''} sauvegardé${count > 1 ? 's' : ''}`)
      startTransition(() => router.refresh())
    } catch (err) {
      setStatus('error')
      setMsg(err instanceof Error ? err.message : 'Erreur inconnue')
    }
  }

  const selectedDayIsEco = ecoSet.has(selectedDay)

  return (
    <Card>
      <CardHeader
        title="Saisie des scores"
        subtitle={`${weekLabel} — saisie manuelle par jour`}
      />

      {/* Day picker */}
      <div className="mt-4 flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5, 6].map((day) => {
          const hasScores = players.some((p) => {
            const v = inputs[`${p.id}:${day}`]
            return v !== undefined && v.trim() !== ''
          })
          const isEco = ecoSet.has(day)
          return (
            <button
              key={day}
              onClick={() => { if (!disabled) { setSelectedDay(day); setMsg(null) } }}
              className={[
                'px-3 py-2 rounded-lg text-sm font-medium transition-colors border flex items-center gap-1.5',
                selectedDay === day
                  ? isEco
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                  : isEco
                  ? 'border-amber-500/30 text-amber-400/80 hover:border-amber-500/50'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]/40',
              ].join(' ')}
            >
              {DAY_LABELS[day]}
              {isEco && (
                <span className="text-[0.55rem] font-bold uppercase tracking-wide">ÉCO</span>
              )}
              {hasScores && !isEco && (
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-success)] align-middle" />
              )}
            </button>
          )
        })}
      </div>

      {/* Eco day notice */}
      {selectedDayIsEco && (
        <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <span className="text-amber-400 text-sm">⚡</span>
          <p className="text-xs text-amber-400">
            Jour éco — les scores seront plafonnés à{' '}
            <strong>{formatScore(ECO_SCORE_CAP)}</strong> pour les calculs.
            Les scores bruts sont conservés.
          </p>
        </div>
      )}

      {/* Score grid for selected day */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {players.map((player) => {
          const key      = `${player.id}:${selectedDay}`
          const existing = existingMap.get(key)
          const value    = inputs[key] ?? ''
          const numValue = Number(value)
          const wouldBeCapped = selectedDayIsEco && !isNaN(numValue) && numValue > ECO_SCORE_CAP

          return (
            <div
              key={player.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)]"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{player.name}</p>
                {existing !== undefined && (
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Actuel : {formatScore(existing)}
                    {selectedDayIsEco && existing > ECO_SCORE_CAP && (
                      <span className="ml-1 text-amber-400">→ {formatScore(ECO_SCORE_CAP)}</span>
                    )}
                  </p>
                )}
                {wouldBeCapped && (
                  <p className="text-[0.65rem] text-amber-400">
                    → plafonné à {formatScore(ECO_SCORE_CAP)}
                  </p>
                )}
              </div>
              <input
                type="number"
                min={0}
                disabled={disabled}
                value={value}
                onChange={(e) => updateInput(player.id, selectedDay, e.target.value)}
                placeholder="0"
                className={[
                  'w-28 px-2.5 py-1.5 text-sm text-right rounded-md border bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none tabular-nums',
                  wouldBeCapped
                    ? 'border-amber-500/40 focus:border-amber-500'
                    : 'border-[var(--color-border)] focus:border-[var(--color-accent)]',
                ].join(' ')}
              />
            </div>
          )
        })}
      </div>

      {players.length === 0 && (
        <p className="mt-4 text-sm text-[var(--color-text-muted)]">
          Aucun joueur actif. Ajoutez des joueurs dans la page Joueurs.
        </p>
      )}

      {/* Save */}
      <div className="mt-4 flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={status === 'loading' || weekId === 0 || players.length === 0 || disabled}
          className="px-5 py-2 text-sm bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-40"
        >
          {status === 'loading' ? 'Sauvegarde…' : `Sauvegarder ${DAY_LABELS[selectedDay]}`}
        </button>
        {disabled && disabledReason && (
          <span className="text-sm text-[var(--color-text-muted)]">{disabledReason}</span>
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
