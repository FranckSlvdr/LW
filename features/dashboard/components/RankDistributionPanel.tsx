'use client'

import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatScore } from '@/lib/utils'
import { useI18n } from '@/lib/i18n/client'
import type { WeekRankStatsApi } from '@/types/api'

interface Props {
  stats: WeekRankStatsApi[]
}

const RANK_VARIANT: Record<string, 'danger' | 'warning' | 'success' | 'info' | 'neutral'> = {
  R5: 'danger',
  R4: 'warning',
  R3: 'success',
  R2: 'info',
  R1: 'neutral',
  unranked: 'neutral',
}

export function RankDistributionPanel({ stats }: Props) {
  const { locale } = useI18n()
  const isFrench = locale === 'fr'
  const rankLabels: Record<string, string> = isFrench
    ? {
        R5: 'R5 Leader',
        R4: 'R4 Officier',
        R3: 'R3 Actif',
        R2: 'R2 Occasionnel',
        R1: 'R1 Inactif',
        unranked: 'Non classe',
      }
    : {
        R5: 'R5 Leader',
        R4: 'R4 Officer',
        R3: 'R3 Active',
        R2: 'R2 Occasional',
        R1: 'R1 Inactive',
        unranked: 'Unranked',
      }

  if (stats.length === 0) return null

  const maxScore = Math.max(...stats.map((stat) => stat.totalScore), 1)

  return (
    <Card padding="none">
      <div className="p-5">
        <CardHeader
          title={isFrench ? 'Distribution par rang' : 'Rank distribution'}
          subtitle={isFrench
            ? `${stats.length} rang${stats.length > 1 ? 's' : ''} - scores VS par tier`
            : `${stats.length} rank${stats.length > 1 ? 's' : ''} - VS scores by tier`}
        />
      </div>

      <div className="px-5 pb-5 space-y-3">
        {stats.map((stat) => {
          const percentage = (stat.totalScore / maxScore) * 100
          const participationPct = Math.round(stat.avgParticipation * 100)

          return (
            <div key={stat.currentRank} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant={RANK_VARIANT[stat.currentRank] ?? 'neutral'}>
                    {rankLabels[stat.currentRank] ?? stat.currentRank}
                  </Badge>
                  <span className="text-[0.65rem] text-[var(--color-text-muted)] shrink-0">
                    {stat.activeCount}/{stat.memberCount} {isFrench ? 'actifs' : 'active'}
                  </span>
                </div>
                <div className="flex items-center gap-4 shrink-0 text-right">
                  <div>
                    <p className="text-xs font-semibold text-[var(--color-text-primary)] tabular-nums">
                      {formatScore(stat.totalScore)}
                    </p>
                    <p className="text-[0.6rem] text-[var(--color-text-muted)]">{isFrench ? 'total' : 'total'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[var(--color-text-primary)] tabular-nums">
                      {stat.activeCount > 0 ? formatScore(stat.avgScore) : '\u2014'}
                    </p>
                    <p className="text-[0.6rem] text-[var(--color-text-muted)]">{isFrench ? 'moy / actif' : 'avg / active'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[var(--color-text-primary)] tabular-nums">
                      {participationPct}%
                    </p>
                    <p className="text-[0.6rem] text-[var(--color-text-muted)]">{isFrench ? 'participation' : 'participation'}</p>
                  </div>
                </div>
              </div>

              <div className="h-1.5 w-full rounded-full bg-[var(--color-surface-raised)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${percentage.toFixed(1)}%`,
                    background: getBarColor(stat.currentRank),
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function getBarColor(rank: string): string {
  switch (rank) {
    case 'R5':
      return 'var(--color-danger)'
    case 'R4':
      return 'var(--color-warning, #f59e0b)'
    case 'R3':
      return 'var(--color-success)'
    case 'R2':
      return 'var(--color-accent)'
    case 'R1':
      return 'var(--color-text-muted)'
    default:
      return 'var(--color-border)'
  }
}
