'use client'

import { useState } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatScore, formatScoreCompact } from '@/lib/utils'
import { interpolate } from '@/lib/i18n/utils'
import { useI18n } from '@/lib/i18n/client'
import type { PlayerKpi } from '@/types/api'

interface RankingTableProps {
  kpis: PlayerKpi[]
}

type SortKey = 'rank' | 'totalScore' | 'daysPlayed' | 'dailyAverage'

function ComponentPill({ value, label }: { value: number | null; label: string }) {
  if (value === null) {
    return <span className="text-[var(--color-text-muted)] text-xs has-tooltip" data-tooltip={`${label} : non calculé`}>—</span>
  }
  const pct = Math.round(value * 100)
  const color =
    pct >= 75 ? 'text-[var(--color-success)]'
    : pct >= 40 ? 'text-[var(--color-accent)]'
    : 'text-[var(--color-warning)]'

  return (
    <span className={`text-xs font-mono font-semibold tabular-nums has-tooltip ${color}`} data-tooltip={`${label} : ${pct}%`}>
      {pct}%
    </span>
  )
}

const TREND_ICONS = {
  up:     { icon: '↑', color: 'text-[var(--color-success)]' },
  down:   { icon: '↓', color: 'text-[var(--color-danger)]' },
  stable: { icon: '—', color: 'text-[var(--color-text-muted)]' },
}

const MEDAL: Record<number, { bg: string; text: string; ring: string }> = {
  0: { bg: 'bg-[#f59e0b]/15', text: 'text-[#f59e0b]', ring: 'ring-1 ring-[#f59e0b]/30' },
  1: { bg: 'bg-[#94a3b8]/15', text: 'text-[#94a3b8]', ring: 'ring-1 ring-[#94a3b8]/25' },
  2: { bg: 'bg-[#b45309]/15', text: 'text-[#cd7c2f]', ring: 'ring-1 ring-[#b45309]/25' },
}

export function RankingTable({ kpis }: RankingTableProps) {
  const { dict } = useI18n()
  const t        = dict.ranking

  const [sortKey, setSortKey] = useState<SortKey>('rank')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const sorted = [...kpis].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    return (a[sortKey] - b[sortKey]) * dir
  })

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'rank' ? 'asc' : 'desc')
    }
  }

  return (
    <Card padding="none">
      <div className="p-5 pb-3">
        <CardHeader
          title={t.title}
          subtitle={interpolate(t.subtitle, { count: kpis.length })}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-[var(--color-surface)]">
            <tr className="border-y border-[var(--color-border)] bg-[var(--color-surface-raised)]/50">
              <SortHeader label={t.colRank}          sortKey="rank"         current={sortKey} dir={sortDir} onSort={handleSort} align="center" />
              <th className="px-5 py-3 text-left text-[var(--color-text-muted)] font-medium text-xs">{t.colPlayer}</th>
              <SortHeader label={t.colTotal}         sortKey="totalScore"   current={sortKey} dir={sortDir} onSort={handleSort} align="right" />
              <SortHeader label={t.colAvgDay}        sortKey="dailyAverage" current={sortKey} dir={sortDir} onSort={handleSort} align="right" />
              <SortHeader label={t.colParticipation} sortKey="daysPlayed"   current={sortKey} dir={sortDir} onSort={handleSort} align="center" />
              <th className="px-5 py-3 text-center text-[var(--color-text-muted)] font-medium text-xs">{t.colTrend}</th>
              <th className="px-5 py-3 text-center text-[var(--color-text-muted)] font-medium text-xs">{t.colEco}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((kpi, idx) => {
              const trend      = kpi.rankTrend ? TREND_ICONS[kpi.rankTrend] : null
              const medal      = MEDAL[idx]
              const partRate   = kpi.daysPlayed / 6
              const partVariant =
                partRate === 1     ? 'success' as const
                : partRate >= 0.67 ? 'neutral' as const
                : partRate > 0     ? 'warning' as const
                :                    'danger'  as const
              const isTop3     = idx < 3

              return (
                <tr
                  key={kpi.playerId}
                  className={[
                    'border-b border-[var(--color-border-subtle)] transition-colors group',
                    'hover:bg-[var(--color-surface-raised)]',
                    kpi.daysPlayed === 0 ? 'opacity-40' : '',
                    isTop3 && kpi.daysPlayed > 0 ? 'bg-[var(--color-surface-raised)]/30' : '',
                  ].join(' ')}
                >
                  <td className="px-5 py-3 text-center">
                    <span className={[
                      'inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold',
                      medal ? `${medal.bg} ${medal.text} ${medal.ring}` : 'bg-[var(--color-surface-raised)] text-[var(--color-text-muted)]',
                    ].join(' ')}>
                      {kpi.rank}
                    </span>
                  </td>

                  <td className="px-5 py-3">
                    <p className="font-medium text-[var(--color-text-primary)]">
                      {kpi.playerName}
                    </p>
                    {kpi.playerAlias && (
                      <p className="text-xs text-[var(--color-text-muted)]">{kpi.playerAlias}</p>
                    )}
                  </td>

                  <td className="px-5 py-3 text-right tabular-nums">
                    <p className="font-bold text-[var(--color-text-primary)]">
                      {kpi.daysPlayed > 0 ? formatScoreCompact(kpi.totalScore) : '—'}
                    </p>
                    {kpi.daysPlayed > 0 && (
                      <p className="text-xs text-[var(--color-text-muted)]">{formatScore(kpi.totalScore)}</p>
                    )}
                  </td>

                  <td className="px-5 py-3 text-right text-[var(--color-text-secondary)] tabular-nums">
                    {kpi.daysPlayed > 0 ? formatScoreCompact(kpi.dailyAverage) : '—'}
                  </td>

                  <td className="px-5 py-3 text-center">
                    <Badge variant={partVariant}>
                      {kpi.daysPlayed === 0 ? t.absent : `${kpi.daysPlayed}/6`}
                    </Badge>
                  </td>

                  <td className="px-5 py-3 text-center">
                    {trend ? (
                      <span className={`text-sm font-bold ${trend.color}`}>
                        {trend.icon}
                        {kpi.previousRank !== null && kpi.rank !== kpi.previousRank
                          ? ` ${Math.abs((kpi.previousRank ?? 0) - kpi.rank)}`
                          : ''}
                      </span>
                    ) : (
                      <span className="text-[var(--color-text-muted)] text-xs">—</span>
                    )}
                  </td>

                  <td className="px-5 py-3 text-center">
                    {kpi.ecoDays > 0 ? (
                      <Badge variant="warning">{kpi.ecoDays}j</Badge>
                    ) : (
                      <span className="text-[var(--color-text-muted)] text-xs">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

interface SortHeaderProps {
  label: string
  sortKey: SortKey
  current: SortKey
  dir: 'asc' | 'desc'
  onSort: (key: SortKey) => void
  align: 'left' | 'right' | 'center'
}

function SortHeader({ label, sortKey, current, dir, onSort, align }: SortHeaderProps) {
  const isActive     = current === sortKey
  const alignClass   = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
  const justifyClass = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'

  return (
    <th className={`px-5 py-3 ${alignClass}`}>
      <button
        onClick={() => onSort(sortKey)}
        className={[
          `inline-flex items-center gap-1 text-xs font-medium transition-colors cursor-pointer ${justifyClass}`,
          isActive
            ? 'text-[var(--color-accent)]'
            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]',
        ].join(' ')}
      >
        {label}
        <span className="opacity-50 text-[0.6rem]">
          {isActive ? (dir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </button>
    </th>
  )
}
