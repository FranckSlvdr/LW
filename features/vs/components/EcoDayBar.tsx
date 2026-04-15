'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { VsDayApi } from '@/types/api'
import { formatScore } from '@/lib/utils'

const DAY_LABELS: Record<number, string> = {
  1: 'Lundi', 2: 'Mardi', 3: 'Mercredi',
  4: 'Jeudi', 5: 'Vendredi', 6: 'Samedi',
}

const ECO_SCORE_CAP = 7_200_000

interface EcoDayBarProps {
  weekId:   number
  vsDays:   VsDayApi[]
  canEdit:  boolean
  disabledReason?: string
}

export function EcoDayBar({ weekId, vsDays, canEdit, disabledReason }: EcoDayBarProps) {
  // Build local eco map for optimistic updates: dayOfWeek → isEco
  const initial = new Map(vsDays.map((d) => [d.dayOfWeek, d.isEco]))
  const [ecoMap, setEcoMap] = useState<Map<number, boolean>>(initial)
  const [pending, setPending] = useState<Set<number>>(new Set())
  const [, startTransition] = useTransition()
  const router = useRouter()

  async function toggle(day: number) {
    if (!canEdit || pending.has(day)) return

    const newValue = !ecoMap.get(day)

    // Optimistic update
    setEcoMap((prev) => new Map(prev).set(day, newValue))
    setPending((prev) => new Set(prev).add(day))

    try {
      const res = await fetch('/api/vs-days', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ weekId, dayOfWeek: day, isEco: newValue }),
      })
      if (!res.ok) {
        // Revert on failure
        setEcoMap((prev) => new Map(prev).set(day, !newValue))
      } else {
        startTransition(() => router.refresh())
      }
    } catch {
      setEcoMap((prev) => new Map(prev).set(day, !newValue))
    } finally {
      setPending((prev) => { const s = new Set(prev); s.delete(day); return s })
    }
  }

  const hasAnyEco = Array.from(ecoMap.values()).some(Boolean)

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Jours éco
          </p>
          <p className="text-[0.7rem] text-[var(--color-text-muted)] mt-0.5">
            Scores plafonnés à {formatScore(ECO_SCORE_CAP)} les jours éco
            {!canEdit && ' · lecture seule'}
          </p>
          {!canEdit && disabledReason && (
            <p className="text-[0.7rem] text-[var(--color-text-muted)] mt-0.5">{disabledReason}</p>
          )}
        </div>
        {hasAnyEco && (
          <span className="text-[0.65rem] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-semibold border border-amber-500/20">
            ÉCO ACTIF
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {([1, 2, 3, 4, 5, 6] as const).map((day) => {
          const isEco = ecoMap.get(day) ?? false
          const isPending = pending.has(day)

          return (
            <button
              key={day}
              onClick={() => toggle(day)}
              disabled={!canEdit || isPending}
              title={
                !canEdit
                  ? `${DAY_LABELS[day]} — ${isEco ? 'éco' : 'normal'}`
                  : `Cliquer pour marquer ${DAY_LABELS[day]} comme ${isEco ? 'normal' : 'éco'}`
              }
              className={[
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border',
                isEco
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)]',
                canEdit && !isPending
                  ? 'cursor-pointer hover:border-amber-500/50'
                  : 'cursor-default',
                isPending ? 'opacity-60' : '',
              ].join(' ')}
            >
              <span>{DAY_LABELS[day]}</span>
              {/* Toggle switch */}
              <span
                className={[
                  'inline-flex items-center w-8 h-4 rounded-full transition-colors shrink-0',
                  isEco ? 'bg-amber-500' : 'bg-[var(--color-border)]',
                ].join(' ')}
              >
                <span
                  className={[
                    'inline-block w-3 h-3 rounded-full bg-white shadow transition-transform',
                    isEco ? 'translate-x-4' : 'translate-x-0.5',
                  ].join(' ')}
                />
              </span>
              {isEco && (
                <span className="text-[0.6rem] font-bold uppercase tracking-wide text-amber-400">
                  ÉCO
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
