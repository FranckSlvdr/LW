'use client'

import { Card, CardHeader } from '@/components/ui/Card'
import { useI18n } from '@/lib/i18n/client'
import type { TrainRunApi } from '@/types/api'

interface TrainHistoryProps {
  runs: TrainRunApi[]
}

export function TrainHistory({ runs }: TrainHistoryProps) {
  const { dict, locale } = useI18n()
  const t                = dict.trains

  const REASON_CONFIG: Record<string, { label: string; color: string }> = {
    ds_top_scorer:    { label: t.reasonDs,      color: 'text-[var(--color-accent)]' },
    best_contributor: { label: t.reasonContrib, color: 'text-[var(--color-success)]' },
    random:           { label: t.reasonRandom,  color: 'text-[var(--color-text-muted)]' },
    manual:           { label: t.reasonManual,  color: 'text-[var(--color-warning)]' },
  }

  if (runs.length === 0) {
    return (
      <Card>
        <CardHeader title={t.historyTitle} subtitle={t.historyEmpty} />
        <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">
          {t.historyEmptyHint}
        </p>
      </Card>
    )
  }

  // Group by week
  const byWeek = new Map<string, { label: string; runs: TrainRunApi[] }>()
  for (const run of runs) {
    const key = String(run.weekId)
    if (!byWeek.has(key)) byWeek.set(key, { label: run.weekLabel, runs: [] })
    byWeek.get(key)!.runs.push(run)
  }

  return (
    <Card padding="none">
      <div className="p-5 pb-3">
        <CardHeader
          title={t.historyTitle}
          subtitle={t.historySubtitle
            .replace('{n}', String(runs.length))
            .replace('{s}', runs.length > 1 ? 's' : '')}
        />
      </div>

      <div className="divide-y divide-[var(--color-border-subtle)]">
        {[...byWeek.entries()].map(([weekId, { label, runs: weekRuns }]) => (
          <div key={weekId} className="px-5 py-4">
            <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">
              {label}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {weekRuns.map((run) => (
                <div
                  key={run.id}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                      {run.trainDayLabel}
                    </span>
                    <span className="text-[0.6rem] text-[var(--color-text-muted)]">
                      {new Date(run.createdAt).toLocaleDateString(locale, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {run.selections.map((sel) => {
                      const reason = REASON_CONFIG[sel.selectionReason] ?? REASON_CONFIG.random!
                      return (
                        <div key={sel.playerId} className="flex items-center justify-between gap-2">
                          <span className="text-xs text-[var(--color-text-primary)] truncate font-medium">
                            {sel.playerName}
                          </span>
                          <span className={`text-[0.6rem] shrink-0 ${reason.color}`}>
                            {reason.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  {run.excludedPlayers.length > 0 && (
                    <p className="text-[0.6rem] text-[var(--color-danger)] mt-1">
                      {t.historyExcluded
                        .replace('{n}', String(run.excludedPlayers.length))
                        .replace('{s}', run.excludedPlayers.length > 1 ? 's' : '')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
