import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { MAX_PROFESSION_LEVEL } from '@/server/engines/ratingEngine'
import { interpolate, s } from '@/lib/i18n/utils'
import type { ProfessionApi } from '@/types/api'
import type { Dictionary } from '@/lib/i18n/types'

interface ProfessionsTableProps {
  professions: ProfessionApi[]
  dict: Dictionary['professions']
}

function LevelBar({ level, dict }: { level: number; dict: Dictionary['professions'] }) {
  const pct = Math.round((level / MAX_PROFESSION_LEVEL) * 100)
  const variant =
    pct >= 80 ? 'success' as const
    : pct >= 50 ? 'accent' as const
    : 'neutral' as const

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-[var(--color-surface-raised)] overflow-hidden min-w-[60px]">
        <div
          className={[
            'h-full rounded-full transition-all',
            pct >= 80 ? 'bg-[var(--color-success)]'
            : pct >= 50 ? 'bg-[var(--color-accent)]'
            : 'bg-[var(--color-border)]',
          ].join(' ')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <Badge variant={variant} size="sm">
        {interpolate(dict.levelBadge, { n: level })}
      </Badge>
    </div>
  )
}

export function ProfessionsTable({ professions, dict }: ProfessionsTableProps) {
  if (professions.length === 0) {
    return (
      <Card>
        <div className="py-12 text-center space-y-2">
          <p className="text-3xl opacity-30">⚗️</p>
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">{dict.empty}</p>
          <p className="text-xs text-[var(--color-text-muted)]">{dict.emptyHint}</p>
        </div>
      </Card>
    )
  }

  const count    = professions.length
  const subtitle = interpolate(dict.tableSubtitle, { n: count, s: s(count) })

  return (
    <Card padding="none">
      <div className="p-5 pb-3">
        <CardHeader title={dict.tableTitle} subtitle={subtitle} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-[var(--color-border)] bg-[var(--color-surface-raised)]/40">
              <th className="px-5 py-3 text-left text-[var(--color-text-muted)] font-medium text-xs">{dict.colPlayer}</th>
              <th className="px-5 py-3 text-left text-[var(--color-text-muted)] font-medium text-xs">{dict.colProfession}</th>
              <th className="px-5 py-3 text-left text-[var(--color-text-muted)] font-medium text-xs w-48">{dict.colLevel}</th>
              <th className="px-5 py-3 text-center text-[var(--color-text-muted)] font-medium text-xs">{dict.colRawScore}</th>
            </tr>
          </thead>
          <tbody>
            {professions.map((p) => {
              const label    = dict.professionLabels[p.professionKey]
              const rawScore = Math.round((p.level / MAX_PROFESSION_LEVEL) * 100)
              return (
                <tr
                  key={p.id}
                  className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-raised)] transition-colors"
                >
                  <td className="px-5 py-3 font-medium text-[var(--color-text-primary)]">
                    {p.playerName}
                  </td>
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                      <span>{getProfessionIcon(p.professionKey)}</span>
                      <span>{label ?? p.professionKey}</span>
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <LevelBar level={p.level} dict={dict} />
                  </td>
                  <td className="px-5 py-3 text-center tabular-nums">
                    <span className="text-xs font-mono text-[var(--color-text-muted)]">
                      {rawScore}%
                    </span>
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

const PROFESSION_ICONS: Record<string, string> = {
  farmer:     '🌾',
  fighter:    '⚔️',
  builder:    '🏗️',
  researcher: '🔬',
  explorer:   '🗺️',
}

function getProfessionIcon(key: string): string {
  return PROFESSION_ICONS[key] ?? '❓'
}
