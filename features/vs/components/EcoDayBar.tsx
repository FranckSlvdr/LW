'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n/client'
import { APP_CONFIG } from '@/config/app.config'
import type { VsDayApi } from '@/types/api'
import { formatScore } from '@/lib/utils'

const DAY_LABELS = {
  fr: {
    1: 'Lundi',
    2: 'Mardi',
    3: 'Mercredi',
    4: 'Jeudi',
    5: 'Vendredi',
    6: 'Samedi',
  },
  en: {
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
  },
} as const

interface EcoDayBarProps {
  weekId: number
  vsDays: VsDayApi[]
  canEdit: boolean
  disabledReason?: string
}

export function EcoDayBar({ weekId, vsDays, canEdit, disabledReason }: EcoDayBarProps) {
  const { locale } = useI18n()
  const isFrench = locale === 'fr'
  const dayLabels = DAY_LABELS[locale]
  const ui = {
    title: isFrench ? 'Jours eco' : 'Eco days',
    subtitle: isFrench
      ? `Scores plafonnes a ${formatScore(APP_CONFIG.ecoScoreCap)} les jours eco`
      : `Scores are capped at ${formatScore(APP_CONFIG.ecoScoreCap)} on eco days`,
    readOnly: isFrench ? 'lecture seule' : 'read-only',
    active: isFrench ? 'ECO ACTIF' : 'ECO ACTIVE',
    eco: isFrench ? 'eco' : 'eco',
    normal: isFrench ? 'normal' : 'normal',
    markAs: (day: string, state: string) => isFrench
      ? `Cliquer pour marquer ${day} comme ${state}`
      : `Click to mark ${day} as ${state}`,
  }
  const initial = new Map(vsDays.map((day) => [day.dayOfWeek, day.isEco]))
  const [ecoMap, setEcoMap] = useState<Map<number, boolean>>(initial)
  const [pending, setPending] = useState<Set<number>>(new Set())
  const [, startTransition] = useTransition()
  const router = useRouter()

  async function toggle(day: number) {
    if (!canEdit || pending.has(day)) return

    const nextValue = !ecoMap.get(day)

    setEcoMap((prev) => new Map(prev).set(day, nextValue))
    setPending((prev) => new Set(prev).add(day))

    try {
      const res = await fetch('/api/vs-days', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekId, dayOfWeek: day, isEco: nextValue }),
      })

      if (!res.ok) {
        setEcoMap((prev) => new Map(prev).set(day, !nextValue))
      } else {
        startTransition(() => router.refresh())
      }
    } catch {
      setEcoMap((prev) => new Map(prev).set(day, !nextValue))
    } finally {
      setPending((prev) => {
        const next = new Set(prev)
        next.delete(day)
        return next
      })
    }
  }

  const hasAnyEco = Array.from(ecoMap.values()).some(Boolean)

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            {ui.title}
          </p>
          <p className="text-[0.7rem] text-[var(--color-text-muted)] mt-0.5">
            {ui.subtitle}
            {!canEdit && ` - ${ui.readOnly}`}
          </p>
          {!canEdit && disabledReason && (
            <p className="text-[0.7rem] text-[var(--color-text-muted)] mt-0.5">{disabledReason}</p>
          )}
        </div>
        {hasAnyEco && (
          <span className="text-[0.65rem] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-semibold border border-amber-500/20">
            {ui.active}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {([1, 2, 3, 4, 5, 6] as const).map((day) => {
          const isEco = ecoMap.get(day) ?? false
          const isPending = pending.has(day)
          const dayLabel = dayLabels[day]

          return (
            <button
              key={day}
              onClick={() => toggle(day)}
              disabled={!canEdit || isPending}
              title={
                !canEdit
                  ? `${dayLabel} - ${isEco ? ui.eco : ui.normal}`
                  : ui.markAs(dayLabel, isEco ? ui.normal : ui.eco)
              }
              className={[
                'flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-all border',
                isEco
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)]',
                canEdit && !isPending ? 'cursor-pointer hover:border-amber-500/50' : 'cursor-default',
                isPending ? 'opacity-60' : '',
              ].join(' ')}
            >
              <span>{dayLabel}</span>
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
                  ECO
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
