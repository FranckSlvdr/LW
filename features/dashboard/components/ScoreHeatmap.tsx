import { Card, CardHeader } from '@/components/ui/Card'
import { formatScoreCompact, formatScore } from '@/lib/utils'
import { interpolate } from '@/lib/i18n/utils'
import { ECO_SCORE_CAP } from '@/server/engines/kpiEngine'
import type { PlayerKpi } from '@/types/api'
import type { DayOfWeek } from '@/types/domain'
import type { Dictionary } from '@/lib/i18n/types'

interface ScoreHeatmapProps {
  kpis: PlayerKpi[]
  dict: Dictionary['heatmap']
}

function heatColors(ratio: number, isEco: boolean): { bg: string; fg: string; border?: string } {
  if (isEco) {
    const a = 0.12 + ratio * 0.35
    return {
      bg: `rgba(245, 158, 11, ${a})`,
      fg: ratio > 0.45 ? 'rgba(245,158,11,1)' : 'rgba(245,158,11,0.8)',
      border: 'rgba(245, 158, 11, 0.3)',
    }
  }
  if (ratio < 0.15) return { bg: 'rgba(79,121,255,0.08)', fg: 'rgba(79,121,255,0.6)' }
  if (ratio < 0.35) return { bg: 'rgba(79,121,255,0.22)', fg: 'rgba(79,121,255,0.9)' }
  if (ratio < 0.55) return { bg: 'rgba(79,121,255,0.42)', fg: 'rgba(255,255,255,0.85)' }
  if (ratio < 0.75) return { bg: 'rgba(79,121,255,0.62)', fg: 'rgba(255,255,255,0.95)' }
  return               { bg: 'rgba(79,121,255,0.85)', fg: 'rgba(255,255,255,1)' }
}

/** Derives the alliance eco status for each day from the first kpi (same for all players) */
function getEcoDaySet(kpis: PlayerKpi[]): Set<DayOfWeek> {
  const set = new Set<DayOfWeek>()
  const first = kpis[0]
  if (!first) return set
  for (const d of first.dailyScores) {
    if (d.isEco) set.add(d.dayOfWeek)
  }
  return set
}

export function ScoreHeatmap({ kpis, dict }: ScoreHeatmapProps) {
  if (kpis.length === 0) return null

  const ecoDays = getEcoDaySet(kpis)
  const allScores = kpis.flatMap((k) => k.dailyScores.map((d) => d.adjustedScore))
  const maxScore  = Math.max(...allScores, 1)
  const sorted    = [...kpis].sort((a, b) => b.totalScore - a.totalScore)

  return (
    <Card padding="none">
      <div className="p-5 pb-3">
        <CardHeader title={dict.title} subtitle={dict.subtitle} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-raised)]/40">
              <th className="px-5 py-2.5 text-left text-[var(--color-text-muted)] font-medium w-40">
                {dict.colPlayer}
              </th>
              {dict.days.map((d, i) => {
                const day = (i + 1) as DayOfWeek
                const isEco = ecoDays.has(day)
                return (
                  <th
                    key={d}
                    className="px-2 py-2.5 text-center font-semibold w-16 tracking-wide"
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className={isEco ? 'text-amber-400' : 'text-[var(--color-text-muted)]'}>
                        {d}
                      </span>
                      {isEco && (
                        <span className="text-[0.5rem] font-bold uppercase tracking-wide text-amber-400 bg-amber-500/15 px-1 rounded">
                          ÉCO
                        </span>
                      )}
                    </div>
                  </th>
                )
              })}
              <th className="px-5 py-2.5 text-right text-[var(--color-text-muted)] font-medium w-24">
                {dict.colTotal}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((kpi, idx) => (
              <tr
                key={kpi.playerId}
                className={[
                  'border-b border-[var(--color-border-subtle)] transition-colors group',
                  'hover:bg-[var(--color-surface-raised)]/60',
                  idx % 2 !== 0 ? 'bg-[var(--color-surface-raised)]/20' : '',
                ].join(' ')}
              >
                <td className="px-5 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--color-text-muted)] text-[0.6rem] w-4 text-right shrink-0 tabular-nums">
                      {kpi.rank}
                    </span>
                    <span className="font-medium text-[var(--color-text-primary)] truncate max-w-[110px]">
                      {kpi.playerName}
                    </span>
                    {kpi.ecoDays > 0 && (
                      <span className="text-[var(--color-warning)] text-[0.55rem] opacity-70 shrink-0">
                        {dict.eco}
                      </span>
                    )}
                  </div>
                </td>

                {kpi.dailyScores.map((day) => (
                  <td key={day.dayOfWeek} className="px-2 py-1.5">
                    <HeatCell
                      rawScore={day.score}
                      adjustedScore={day.adjustedScore}
                      max={maxScore}
                      isEco={day.isEco}
                      playerName={kpi.playerName}
                      day={dict.days[day.dayOfWeek - 1] ?? ''}
                      dict={dict}
                    />
                  </td>
                ))}

                <td className="px-5 py-2 text-right tabular-nums">
                  {kpi.daysPlayed === 0 ? (
                    <span className="text-[var(--color-text-muted)]">—</span>
                  ) : (
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="font-bold text-[var(--color-text-primary)]">
                        {formatScoreCompact(kpi.totalScore)}
                      </span>
                      {kpi.rawTotalScore > kpi.totalScore && (
                        <span className="text-[0.55rem] text-[var(--color-text-muted)] tabular-nums">
                          brut {formatScoreCompact(kpi.rawTotalScore)}
                        </span>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="px-5 py-3 border-t border-[var(--color-border)] flex flex-wrap items-center gap-4 text-[0.65rem] text-[var(--color-text-muted)]">
        <LegendItem color="var(--color-surface-raised)" label={dict.legendAbsent} />
        <LegendItem color="rgba(245,158,11,0.35)" label={dict.legendEco} border="rgba(245,158,11,0.3)" />
        <div className="flex items-center gap-1.5">
          <div
            className="w-20 h-3 rounded-sm"
            style={{ background: 'linear-gradient(to right, rgba(79,121,255,0.08), rgba(79,121,255,0.85))' }}
          />
          <span>{dict.legendRange}</span>
        </div>
      </div>
    </Card>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface HeatCellProps {
  rawScore:      number
  adjustedScore: number
  max:           number
  isEco:         boolean
  playerName:    string
  day:           string
  dict:          Dictionary['heatmap']
}

function HeatCell({ rawScore, adjustedScore, max, isEco, playerName, day, dict }: HeatCellProps) {
  if (rawScore === 0) {
    return (
      <div
        className="w-12 h-7 rounded mx-auto flex items-center justify-center has-tooltip"
        style={{ background: 'rgba(22,22,42,0.5)' }}
        data-tooltip={interpolate(dict.tooltipAbsent, { player: playerName, day, absentWord: dict.absent })}
      >
        <span className="text-[var(--color-text-muted)] text-[0.5rem]">—</span>
      </div>
    )
  }

  const ratio   = Math.max(0.05, adjustedScore / max)
  const colors  = heatColors(ratio, isEco)

  // Tooltip: show raw + capped info when eco caps the score
  const wasCapped = isEco && rawScore > ECO_SCORE_CAP
  const tooltip = wasCapped
    ? interpolate(dict.tooltipScoreEcoCapped, {
        player:     playerName,
        day,
        score:      formatScore(rawScore),
        adjusted:   formatScore(adjustedScore),
        ecoWord:    dict.eco,
      })
    : isEco
    ? interpolate(dict.tooltipScoreEco, { player: playerName, day, score: formatScore(rawScore), ecoWord: dict.eco })
    : interpolate(dict.tooltipScore,    { player: playerName, day, score: formatScore(rawScore) })

  return (
    <div
      className="w-12 h-7 rounded mx-auto flex items-center justify-center has-tooltip transition-transform hover:scale-110 cursor-default relative"
      style={{
        background: colors.bg,
        border: colors.border ? `1px solid ${colors.border}` : undefined,
      }}
      data-tooltip={tooltip}
    >
      <span className="text-[0.55rem] font-semibold tabular-nums" style={{ color: colors.fg }}>
        {formatScoreCompact(adjustedScore)}
      </span>
      {wasCapped && (
        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" title="Plafonné" />
      )}
    </div>
  )
}

function LegendItem({ color, label, border }: { color: string; label: string; border?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="w-3 h-3 rounded-sm"
        style={{ background: color, border: border ? `1px solid ${border}` : undefined }}
      />
      <span>{label}</span>
    </div>
  )
}
