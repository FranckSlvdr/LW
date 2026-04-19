'use client'

import { useState } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { useI18n } from '@/lib/i18n/client'
import { formatScore } from '@/lib/utils'
import type { PlayerApi, ContributionApi } from '@/types/api'
import { getContributionMessages } from '../messages'

interface ContributionFormProps {
  weekId: number
  players: PlayerApi[]
  existing: ContributionApi[]
  disabled?: boolean
  disabledReason?: string
}

export function ContributionForm({
  weekId,
  players,
  existing,
  disabled = false,
  disabledReason,
}: ContributionFormProps) {
  const { locale } = useI18n()
  const t = getContributionMessages(locale).form
  const existingMap = new Map(existing.map((c) => [c.playerId, c]))
  const [entries, setEntries] = useState<Array<{ playerId: number; amount: string; note: string }>>(
    players.map((p) => ({
      playerId: p.id,
      amount: String(existingMap.get(p.id)?.amount ?? ''),
      note: existingMap.get(p.id)?.note ?? '',
    })),
  )
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState<string | null>(null)

  function update(playerId: number, field: 'amount' | 'note', value: string) {
    setEntries((prev) =>
      prev.map((e) => e.playerId === playerId ? { ...e, [field]: value } : e),
    )
  }

  async function handleSave() {
    setStatus('loading')
    setMsg(null)
    const toSave = entries.filter((e) => e.amount.trim() !== '' && !Number.isNaN(Number(e.amount)))
    try {
      const results = await Promise.allSettled(
        toSave.map(async (e) => {
          const res = await fetch('/api/contributions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerId: e.playerId,
              weekId,
              amount: Number(e.amount),
              note: e.note.trim() || undefined,
            }),
          })
          if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error(data?.error?.message ?? t.saveError)
          }
        }),
      )
      const succeeded = results.filter((r) => r.status === 'fulfilled').length
      const failed = results.filter((r) => r.status === 'rejected')
      if (failed.length > 0) {
        const firstErr = (failed[0] as PromiseRejectedResult).reason
        setStatus('error')
        setMsg(t.saveSummary(succeeded, failed.length, firstErr instanceof Error ? firstErr.message : t.unknownError))
      } else {
        setStatus('done')
        setMsg(t.saveSuccess(succeeded))
      }
    } catch {
      setStatus('error')
      setMsg(t.saveError)
    }
  }

  const playerMap = new Map(players.map((p) => [p.id, p]))

  return (
    <Card>
      <CardHeader title={t.title} subtitle={t.subtitle} />

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {entries.map((entry) => {
          const player = playerMap.get(entry.playerId)
          const current = existingMap.get(entry.playerId)
          if (!player) return null

          return (
            <div key={entry.playerId} className="flex items-start gap-3 p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)]">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{player.name}</p>
                {current && (
                  <p className="text-xs text-[var(--color-text-muted)]">{t.current}: {formatScore(current.amount)}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <input
                  type="number"
                  min={0}
                  disabled={disabled}
                  value={entry.amount}
                  onChange={(e) => update(entry.playerId, 'amount', e.target.value)}
                  placeholder="0"
                  className="w-28 px-2.5 py-1.5 text-sm text-right rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] tabular-nums"
                />
                <input
                  type="text"
                  disabled={disabled}
                  value={entry.note}
                  onChange={(e) => update(entry.playerId, 'note', e.target.value)}
                  placeholder={t.notePlaceholder}
                  className="w-28 px-2.5 py-1.5 text-xs rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>
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
          {status === 'loading' ? t.saving : t.save}
        </button>
        {disabled && disabledReason && (
          <span className="text-sm text-[var(--color-text-muted)]">{disabledReason}</span>
        )}
        {status === 'error' && (
          <button
            onClick={() => { setStatus('idle'); setMsg(null) }}
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
