import { formatScoreCompact } from '@/lib/utils'
import { Card, CardHeader } from '@/components/ui/Card'
import type { PlayerKpi } from '@/types/api'
import type { Dictionary } from '@/lib/i18n/types'

interface Props {
  kpis: PlayerKpi[]
  dict: Dictionary['heatmap']
  locale: 'fr' | 'en'
}

export function MobileScoreSummary({ kpis, dict, locale }: Props) {
  const isFr = locale === 'fr'
  const sorted = [...kpis].sort((a, b) => a.rank - b.rank)

  return (
    <Card>
      <CardHeader
        title={isFr ? 'Scores VS' : 'VS Scores'}
        subtitle={`${sorted.length} ${isFr ? 'joueurs' : 'players'}`}
      />

      <div className="divide-y divide-[var(--color-border)] -mx-5 mt-1">
        {sorted.map((kpi) => {
          const absent = kpi.daysPlayed === 0
          const hasEco = kpi.ecoDays > 0

          return (
            <div
              key={kpi.playerId}
              className={[
                'flex items-center gap-3 px-5 py-2.5',
                absent ? 'opacity-40' : '',
              ].join(' ')}
            >
              {/* Rank position */}
              <span className="w-6 text-center text-xs font-bold text-[var(--color-text-muted)] shrink-0">
                {kpi.rank}
              </span>

              {/* Player name */}
              <span className="flex-1 min-w-0 text-sm font-medium text-[var(--color-text-primary)] truncate">
                {kpi.playerName}
              </span>

              {/* Eco indicator */}
              {hasEco && (
                <span className="text-xs text-[var(--color-text-muted)] shrink-0" title={dict.eco}>
                  🌙
                </span>
              )}

              {/* Total score */}
              <span className="text-sm font-bold text-[var(--color-accent)] shrink-0 tabular-nums">
                {absent ? dict.absent : formatScoreCompact(kpi.totalScore)}
              </span>

              {/* Days played */}
              <span className="text-[0.65rem] text-[var(--color-text-muted)] shrink-0 w-8 text-right tabular-nums">
                {kpi.daysPlayed}/6
              </span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
