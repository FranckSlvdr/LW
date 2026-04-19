'use client'

import { useCallback, useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n/client'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { WeekApi } from '@/types/api'
import { getWeeksMessages } from '../messages'

function getNextMonday(latestStartDate: string): string {
  const d = new Date(latestStartDate)
  d.setDate(d.getDate() + 7)
  return d.toISOString().split('T')[0]
}

export function WeekManagerPanel() {
  const { locale } = useI18n()
  const t = getWeeksMessages(locale)
  const [weeks, setWeeks] = useState<WeekApi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [lockingId, setLockingId] = useState<number | null>(null)
  const [closing, setClosing] = useState(false)

  const loadWeeks = useCallback(async () => {
    try {
      const res = await fetch('/api/weeks')
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error?.message ?? t.errors.load)
      setWeeks(json.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : t.errors.unknown)
    } finally {
      setLoading(false)
    }
  }, [t.errors.load, t.errors.unknown])

  useEffect(() => {
    void loadWeeks()
  }, [loadWeeks])

  async function handleCreate() {
    if (weeks.length === 0) return

    const nextMonday = getNextMonday(weeks[0].startDate)
    setCreating(true)
    setError(null)

    try {
      const res = await fetch('/api/weeks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: nextMonday }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error?.message ?? t.errors.create)
      const created = json.data as WeekApi
      setWeeks((prev) => [created, ...prev])
    } catch (e) {
      setError(e instanceof Error ? e.message : t.errors.unknown)
    } finally {
      setCreating(false)
    }
  }

  async function handleToggleLock(week: WeekApi) {
    setLockingId(week.id)
    setError(null)

    try {
      const res = await fetch(`/api/weeks/${week.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLocked: !week.isLocked }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error?.message ?? t.errors.lock)
      const updated = json.data as WeekApi
      setWeeks((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
    } catch (e) {
      setError(e instanceof Error ? e.message : t.errors.unknown)
    } finally {
      setLockingId(null)
    }
  }

  async function handleCloseAndAdvance() {
    const latestWeek = weeks[0]
    if (!latestWeek || latestWeek.isLocked) return

    setClosing(true)
    setError(null)
    const nextMonday = getNextMonday(latestWeek.startDate)

    try {
      const lockRes = await fetch(`/api/weeks/${latestWeek.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLocked: true }),
      })
      const lockJson = await lockRes.json().catch(() => ({}))
      if (!lockRes.ok) throw new Error(lockJson.error?.message ?? t.errors.lock)

      const createRes = await fetch('/api/weeks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: nextMonday }),
      })
      const createJson = await createRes.json().catch(() => ({}))
      if (!createRes.ok) throw new Error(createJson.error?.message ?? t.errors.create)

      const lockedWeek = lockJson.data as WeekApi
      const createdWeek = createJson.data as WeekApi
      setWeeks((prev) => [createdWeek, ...prev.map((item) => (item.id === lockedWeek.id ? lockedWeek : item))])
    } catch (e) {
      setError(e instanceof Error ? e.message : t.errors.unknown)
      await loadWeeks()
    } finally {
      setClosing(false)
    }
  }

  const latestWeek = weeks[0]
  const nextMonday = latestWeek ? getNextMonday(latestWeek.startDate) : null

  return (
    <Card>
      <CardHeader title={t.title} subtitle={t.subtitle} />

      {error && (
        <div className="mt-3 px-3 py-2 rounded-lg bg-[var(--color-danger)]/10 text-[var(--color-danger)] text-xs">
          {error}
        </div>
      )}

      {nextMonday && (
        <div className="mt-4 flex items-center justify-between gap-4 px-3 py-3 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface-raised)]">
          <div>
            <p className="text-xs font-medium text-[var(--color-text-primary)]">{t.nextWeek}</p>
            <p className="text-[0.65rem] text-[var(--color-text-muted)] mt-0.5">
              {t.startsOn} {nextMonday}
            </p>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="shrink-0 px-3 py-1.5 text-xs font-semibold bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-40"
          >
            {creating ? t.creating : t.create}
          </button>
        </div>
      )}

      {latestWeek && !latestWeek.isLocked && nextMonday && (
        <div className="mt-3 flex items-center justify-between gap-4 px-3 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div>
            <p className="text-xs font-medium text-[var(--color-text-primary)]">{t.closingTitle}</p>
            <p className="text-[0.65rem] text-[var(--color-text-muted)] mt-0.5">
              {t.closingHint(latestWeek.label, nextMonday)}
            </p>
          </div>
          <button
            onClick={handleCloseAndAdvance}
            disabled={closing}
            className="shrink-0 px-3 py-1.5 text-xs font-semibold border border-[var(--color-accent)] text-[var(--color-accent)] rounded-lg hover:bg-[var(--color-accent)]/10 transition-colors disabled:opacity-40"
          >
            {closing ? t.closing : t.closeAndAdvance}
          </button>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {loading && (
          <p className="text-xs text-[var(--color-text-muted)] text-center py-4">{t.loading}</p>
        )}

        {!loading && weeks.length === 0 && (
          <p className="text-xs text-[var(--color-text-muted)] text-center py-4">{t.empty}</p>
        )}

        {weeks.map((week, index) => (
          <div
            key={week.id}
            className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)]"
          >
            <div className="flex items-center gap-2 min-w-0">
              {index === 0 && <Badge variant="success">{t.active}</Badge>}
              <div className="min-w-0">
                <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">{week.label}</p>
                <p className="text-[0.6rem] text-[var(--color-text-muted)]">
                  {week.startDate} → {week.endDate}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {week.isLocked && <Badge variant="neutral">{t.locked}</Badge>}
              <button
                onClick={() => handleToggleLock(week)}
                disabled={lockingId === week.id || closing}
                title={week.isLocked ? t.unlockTitle : t.lockTitle}
                className="px-2.5 py-1 text-[0.65rem] font-medium rounded-md border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors disabled:opacity-40"
              >
                {lockingId === week.id ? '…' : week.isLocked ? t.open : t.lock}
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
