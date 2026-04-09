/**
 * KpiCards — Server Component.
 * Passes only serializable props to StatCard (Client Component).
 */
import { StatCard } from '@/components/ui/StatCard'
import { formatScore, formatScoreCompact } from '@/lib/utils'
import { interpolate } from '@/lib/i18n/utils'
import type { WeekKpiSummary } from '@/types/api'
import type { Dictionary } from '@/lib/i18n/types'

interface KpiCardsProps {
  summary: WeekKpiSummary
  totalRegisteredPlayers?: number
  dict: Dictionary['kpi']
}

export function KpiCards({ summary, totalRegisteredPlayers = 20, dict }: KpiCardsProps) {
  const { globalTotalScore, globalRawTotalScore, globalAverageScore, totalPlayers, vsLastWeek } = summary

  const totalTrend = vsLastWeek
    ? vsLastWeek.globalTotalScoreDelta > 0 ? 'up'     as const
    : vsLastWeek.globalTotalScoreDelta < 0 ? 'down'   as const
    :                                         'stable' as const
    : null

  const totalTrendLabel = vsLastWeek
    ? interpolate(dict.vsLastWeek, {
        delta: `${vsLastWeek.globalTotalScoreDelta > 0 ? '+' : ''}${formatScoreCompact(vsLastWeek.globalTotalScoreDelta)}`,
      })
    : undefined

  const participationRate      = totalRegisteredPlayers > 0 ? totalPlayers / totalRegisteredPlayers : 0
  const participationPct       = Math.round(participationRate * 100)
  const participationTrend =
    vsLastWeek?.participationDelta != null
      ? vsLastWeek.participationDelta > 0 ? 'up'     as const
      : vsLastWeek.participationDelta < 0 ? 'down'   as const
      :                                      'stable' as const
      : null
  const participationTrendLabel =
    vsLastWeek?.participationDelta != null && vsLastWeek.participationDelta !== 0
      ? interpolate(dict.vsLastWeek, {
          delta: `${vsLastWeek.participationDelta > 0 ? '+' : ''}${vsLastWeek.participationDelta}`,
        })
      : undefined

  // Show eco cap impact only when scores were actually capped
  const ecoCapped = globalRawTotalScore > globalTotalScore
  const ecoSubvalue = ecoCapped
    ? `Brut : ${formatScore(globalRawTotalScore)}`
    : `${formatScore(globalTotalScore)} pts`

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger">

      <StatCard
        label={dict.totalScore}
        value={formatScoreCompact(globalTotalScore)}
        rawValue={globalTotalScore}
        format="compact"
        iconId="lightning"
        subvalue={ecoSubvalue}
        trend={totalTrend}
        trendLabel={totalTrendLabel}
        accent
      />

      <StatCard
        label={dict.avgPerPlayer}
        value={formatScoreCompact(globalAverageScore)}
        rawValue={globalAverageScore}
        format="compact"
        iconId="chart"
        subvalue={dict.avgPerWeek}
      />

      <StatCard
        label={dict.activePlayers}
        value={String(totalPlayers)}
        rawValue={totalPlayers}
        format="number"
        iconId="users"
        subvalue={interpolate(dict.outOf, { total: totalRegisteredPlayers })}
        trend={participationTrend}
        trendLabel={participationTrendLabel}
      />

      <StatCard
        label={dict.participation}
        value={`${participationPct}%`}
        rawValue={participationPct}
        format="percent"
        iconId="check"
        subvalue={interpolate(dict.playersRatio, { n: totalPlayers, total: totalRegisteredPlayers })}
      />

    </div>
  )
}
