import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader } from '@/components/ui/Card'
import { formatScoreCompact } from '@/lib/utils'
import { interpolate } from '@/lib/i18n/utils'
import type { PlayerKpi } from '@/types/api'
import type { Dictionary } from '@/lib/i18n/types'

interface TopFlopPanelProps {
  topPlayers: PlayerKpi[]
  flopPlayers: PlayerKpi[]
  dict: Dictionary['topFlop']
}

export function TopFlopPanel({ topPlayers, flopPlayers, dict }: TopFlopPanelProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <PlayerRankCard
        title={dict.top5Title}
        subtitle={dict.top5Subtitle}
        players={topPlayers}
        variant="top"
        dict={dict}
      />
      <PlayerRankCard
        title={dict.flop5Title}
        subtitle={dict.flop5Subtitle}
        players={flopPlayers}
        variant="flop"
        dict={dict}
      />
    </div>
  )
}

interface PlayerRankCardProps {
  title: string
  subtitle: string
  players: PlayerKpi[]
  variant: 'top' | 'flop'
  dict: Dictionary['topFlop']
}

const TREND_ICONS = {
  up:     { icon: '↑', color: 'text-[var(--color-success)]' },
  down:   { icon: '↓', color: 'text-[var(--color-danger)]' },
  stable: { icon: '→', color: 'text-[var(--color-text-muted)]' },
}

function PlayerRankCard({ title, subtitle, players, variant, dict }: PlayerRankCardProps) {
  const isTop = variant === 'top'

  return (
    <Card>
      <CardHeader
        title={title}
        subtitle={subtitle}
        action={
          <Badge variant={isTop ? 'success' : 'danger'}>
            {isTop ? '🏆' : '⚠️'} {title}
          </Badge>
        }
      />

      <div className="space-y-1">
        {players.map((player, index) => {
          const trend           = player.rankTrend ? TREND_ICONS[player.rankTrend] : null
          const daysLabel       = `${player.daysPlayed}/6j`
          const participationOk = player.daysPlayed >= 5

          return (
            <div
              key={player.playerId}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--color-surface-raised)] transition-colors group"
            >
              <span
                className={[
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                  index === 0 && isTop
                    ? 'bg-[var(--color-warning)]/20 text-[var(--color-warning)]'
                    : 'bg-[var(--color-surface-raised)] text-[var(--color-text-muted)]',
                ].join(' ')}
              >
                {player.rank}
              </span>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                  {player.playerName}
                  {player.playerAlias && (
                    <span className="ml-1.5 text-xs text-[var(--color-text-muted)]">
                      ({player.playerAlias})
                    </span>
                  )}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {daysLabel}
                  {player.ecoDays > 0 && (
                    <span className="ml-1.5 text-[var(--color-warning)]">
                      · {interpolate(dict.ecoLabel, { n: player.ecoDays })}
                    </span>
                  )}
                </p>
              </div>

              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-[var(--color-text-primary)]">
                  {formatScoreCompact(player.totalScore)}
                </p>
                {trend && (
                  <p className={`text-xs font-semibold ${trend.color}`}>
                    {trend.icon}
                    {player.previousRank !== null && player.rank !== player.previousRank
                      ? ` ${Math.abs((player.previousRank ?? 0) - player.rank)}`
                      : ''}
                  </p>
                )}
              </div>

              {!participationOk && player.daysPlayed > 0 && (
                <Badge variant="warning" size="sm">{daysLabel}</Badge>
              )}
              {player.daysPlayed === 0 && (
                <Badge variant="danger" size="sm">{dict.absent}</Badge>
              )}
            </div>
          )
        })}

        {players.length === 0 && (
          <p className="text-sm text-[var(--color-text-muted)] text-center py-6">
            {dict.noData}
          </p>
        )}
      </div>
    </Card>
  )
}
