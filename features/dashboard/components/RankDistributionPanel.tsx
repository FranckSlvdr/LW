import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatScore } from '@/lib/utils'
import type { WeekRankStatsApi } from '@/types/api'

interface Props {
  stats: WeekRankStatsApi[]
}

const RANK_LABEL: Record<string, string> = {
  R5: 'R5 Leader',
  R4: 'R4 Officier',
  R3: 'R3 Actif',
  R2: 'R2 Occasionnel',
  R1: 'R1 Inactif',
  unranked: 'Non classé',
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
  if (stats.length === 0) return null

  const maxScore = Math.max(...stats.map((s) => s.totalScore), 1)

  return (
    <Card padding="none">
      <div className="p-5">
        <CardHeader
          title="Distribution par rang"
          subtitle={`${stats.length} rang${stats.length > 1 ? 's' : ''} · scores VS par tier`}
        />
      </div>

      <div className="px-5 pb-5 space-y-3">
        {stats.map((s) => {
          const pct = (s.totalScore / maxScore) * 100
          const participationPct = Math.round(s.avgParticipation * 100)

          return (
            <div key={s.currentRank} className="space-y-1.5">
              {/* Header row */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant={RANK_VARIANT[s.currentRank] ?? 'neutral'}>
                    {RANK_LABEL[s.currentRank] ?? s.currentRank}
                  </Badge>
                  <span className="text-[0.65rem] text-[var(--color-text-muted)] shrink-0">
                    {s.activeCount}/{s.memberCount} actifs
                  </span>
                </div>
                <div className="flex items-center gap-4 shrink-0 text-right">
                  <div>
                    <p className="text-xs font-semibold text-[var(--color-text-primary)] tabular-nums">
                      {formatScore(s.totalScore)}
                    </p>
                    <p className="text-[0.6rem] text-[var(--color-text-muted)]">total</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[var(--color-text-primary)] tabular-nums">
                      {s.activeCount > 0 ? formatScore(s.avgScore) : '—'}
                    </p>
                    <p className="text-[0.6rem] text-[var(--color-text-muted)]">moy / actif</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[var(--color-text-primary)] tabular-nums">
                      {participationPct}%
                    </p>
                    <p className="text-[0.6rem] text-[var(--color-text-muted)]">participation</p>
                  </div>
                </div>
              </div>

              {/* Score bar */}
              <div className="h-1.5 w-full rounded-full bg-[var(--color-surface-raised)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct.toFixed(1)}%`,
                    background: getBarColor(s.currentRank),
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
    case 'R5': return 'var(--color-danger)'
    case 'R4': return 'var(--color-warning, #f59e0b)'
    case 'R3': return 'var(--color-success)'
    case 'R2': return 'var(--color-accent)'
    case 'R1': return 'var(--color-text-muted)'
    default:   return 'var(--color-border)'
  }
}
