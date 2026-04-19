'use client'

import { useState } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useI18n } from '@/lib/i18n/client'
import type { TrainRunApi, TrainSettingsApi } from '@/types/api'

interface TrainSelectorProps {
  weekId: number
  weekLabel: string
  settings: TrainSettingsApi
  existingRuns: TrainRunApi[]
  canTrigger: boolean
}

export function TrainSelector({ weekId, weekLabel, settings, existingRuns, canTrigger }: TrainSelectorProps) {
  const { dict, locale }              = useI18n()
  const t                             = dict.trains
  const isFrench                      = locale === 'fr'
  const [selectedDay, setSelectedDay] = useState<number>(1)
  const [loading, setLoading]         = useState<'idle' | 'day' | 'week'>('idle')
  const [errorMsg, setErrorMsg]       = useState<string | null>(null)
  const [localRuns, setLocalRuns]     = useState<TrainRunApi[]>(existingRuns)

  const currentRun   = localRuns.find((r) => r.trainDay === selectedDay)
  const drawnDays    = localRuns.map((r) => r.trainDay)
  const allDaysDrawn = drawnDays.length === 7

  // Build reason badge map from dict
  const REASON_BADGE: Record<string, { label: string; variant: 'success' | 'accent' | 'neutral' | 'warning' }> = {
    ds_top_scorer:    { label: t.reasonDs,      variant: 'accent' },
    best_contributor: { label: t.reasonContrib, variant: 'success' },
    random:           { label: t.reasonRandom,  variant: 'neutral' },
    manual:           { label: t.reasonManual,  variant: 'warning' },
  }

  async function handleRun() {
    setLoading('day')
    setErrorMsg(null)
    try {
      const res  = await fetch('/api/trains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekId, trainDay: selectedDay }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error?.message ?? (isFrench ? 'Erreur' : 'Error'))
      const newRun: TrainRunApi = data.data
      setLocalRuns((prev) => [...prev.filter((r) => r.trainDay !== selectedDay), newRun])
      setLoading('idle')
    } catch (err) {
      setLoading('idle')
      setErrorMsg(err instanceof Error ? err.message : (isFrench ? 'Erreur inconnue' : 'Unknown error'))
    }
  }

  async function handleRunWeek() {
    setLoading('week')
    setErrorMsg(null)
    try {
      const res  = await fetch('/api/trains/week', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error?.message ?? (isFrench ? 'Erreur' : 'Error'))
      const newRuns: TrainRunApi[] = data.data
      setLocalRuns(newRuns)
      setLoading('idle')
    } catch (err) {
      setLoading('idle')
      setErrorMsg(err instanceof Error ? err.message : (isFrench ? 'Erreur inconnue' : 'Unknown error'))
    }
  }

  return (
    <Card>
      <CardHeader
        title={t.selectorTitle}
        subtitle={t.selectorSubtitle.replace('{label}', weekLabel)}
      />

      {/* Day picker */}
      <div className="mt-4 flex flex-wrap gap-2">
        {([1, 2, 3, 4, 5, 6, 7] as const).map((day) => {
          const hasRun = localRuns.some((r) => r.trainDay === day)
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={[
                'px-3 py-2 rounded-lg text-sm font-medium transition-colors border',
                selectedDay === day
                  ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]/40',
              ].join(' ')}
            >
              {t.days[day - 1]}
              {hasRun && (
                <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-success)] align-middle" />
              )}
            </button>
          )
        })}
      </div>

      {/* Config summary */}
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="px-2 py-1 rounded-md bg-[var(--color-surface-raised)] text-[var(--color-text-muted)]">
          {t.driversPerDay
            .replace('{n}', String(settings.totalDriversPerDay))
            .replace('{s}', settings.totalDriversPerDay > 1 ? 's' : '')}
        </span>
        {settings.exclusionWindowWeeks > 0 && (
          <span className="px-2 py-1 rounded-md bg-[var(--color-warning-dim)] text-[var(--color-warning)]">
            {t.exclusionBadge.replace('{n}', String(settings.exclusionWindowWeeks))}
          </span>
        )}
        {settings.includeDsTop2 && (
          <span className="px-2 py-1 rounded-md bg-[var(--color-info-dim)] text-[var(--color-info)]">
            {t.dsReservedBadge}
          </span>
        )}
        {settings.includeBestContributor && (
          <span className="px-2 py-1 rounded-md bg-[var(--color-success-dim)] text-[var(--color-success)]">
            {t.contribReservedBadge}
          </span>
        )}
      </div>

      {/* Launch buttons — hidden for roles without trains:trigger */}
      {canTrigger && <div className="mt-4 flex flex-wrap items-center gap-3">
        {/* Single-day draw */}
        <button
          onClick={handleRun}
          disabled={loading !== 'idle' || weekId === 0}
          className="px-5 py-2.5 text-sm font-semibold bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-40"
        >
          {loading === 'day'
            ? t.btnDrawing
            : currentRun
            ? t.btnRedrawDay
            : t.btnDrawDay.replace('{day}', t.days[selectedDay - 1] ?? '')}
        </button>

        {/* Full-week draw */}
        <button
          onClick={handleRunWeek}
          disabled={loading !== 'idle' || weekId === 0}
          className="px-5 py-2.5 text-sm font-semibold border border-[var(--color-accent)] text-[var(--color-accent)] rounded-lg hover:bg-[var(--color-accent)]/10 transition-colors disabled:opacity-40"
        >
          {loading === 'week'
            ? t.btnWeekDrawing
            : allDaysDrawn
            ? t.btnRedrawWeek
            : t.btnDrawWeek}
        </button>

        {errorMsg && <span className="text-sm text-[var(--color-danger)]">{errorMsg}</span>}
      </div>}

      {/* Results */}
      {currentRun && (
        <div className="mt-5 space-y-3">
          <p className="text-xs text-[var(--color-text-muted)] font-semibold uppercase tracking-wide">
            {t.selectedDrivers.replace('{day}', t.days[currentRun.trainDay - 1] ?? '')}
          </p>

          <div className="space-y-2">
            {currentRun.selections.map((sel) => {
              const reason = REASON_BADGE[sel.selectionReason] ?? REASON_BADGE.random!
              return (
                <div
                  key={sel.playerId}
                  className="flex items-center justify-between px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)]"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent)] text-xs font-bold flex items-center justify-center">
                      {sel.position}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">{sel.playerName}</p>
                      {sel.playerAlias && <p className="text-xs text-[var(--color-text-muted)]">{sel.playerAlias}</p>}
                    </div>
                  </div>
                  <Badge variant={reason.variant}>{reason.label}</Badge>
                </div>
              )
            })}
          </div>

          {currentRun.excludedPlayers.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-[var(--color-text-muted)] font-semibold mb-1.5">
                {t.excludedPlayers.replace('{n}', String(currentRun.excludedPlayers.length))}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {currentRun.excludedPlayers.map((ep) => (
                  <span
                    key={ep.playerId}
                    className="px-2 py-1 rounded-md text-xs bg-[var(--color-danger-dim)] text-[var(--color-danger)] border border-[var(--color-danger)]/15"
                    title={t.excludedTooltip
                      .replace('{n}', String(ep.weeksAgo))
                      .replace('{s}', ep.weeksAgo > 1 ? 's' : '')}
                  >
                    {ep.playerName} {t.weeksAgo.replace('{n}', String(ep.weeksAgo))}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
