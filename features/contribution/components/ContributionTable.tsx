import { Card, CardHeader } from '@/components/ui/Card'
import { formatScore } from '@/lib/utils'
import { getLocale } from '@/lib/i18n/server'
import type { ContributionApi } from '@/types/api'
import { getContributionMessages } from '../messages'

interface ContributionTableProps {
  contributions: ContributionApi[]
}

const MEDAL: Record<number, { bg: string; text: string; ring: string }> = {
  1: { bg: 'bg-[#f59e0b]/15', text: 'text-[#f59e0b]', ring: 'ring-1 ring-[#f59e0b]/30' },
  2: { bg: 'bg-[#94a3b8]/15', text: 'text-[#94a3b8]', ring: 'ring-1 ring-[#94a3b8]/25' },
  3: { bg: 'bg-[#b45309]/15', text: 'text-[#cd7c2f]', ring: 'ring-1 ring-[#b45309]/25' },
}

export async function ContributionTable({ contributions }: ContributionTableProps) {
  const locale = await getLocale()
  const t = getContributionMessages(locale).table

  if (contributions.length === 0) {
    return (
      <Card>
        <div className="py-12 text-center space-y-2">
          <p className="text-3xl opacity-30">💰</p>
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">{t.empty}</p>
          <p className="text-xs text-[var(--color-text-muted)]">{t.emptyHint}</p>
        </div>
      </Card>
    )
  }

  const max = contributions[0]?.amount ?? 1

  return (
    <Card padding="none">
      <div className="p-5 pb-3">
        <CardHeader
          title={t.title}
          subtitle={`${contributions.length} ${t.player.toLowerCase()}${contributions.length > 1 ? 's' : ''}`}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-[var(--color-border)] bg-[var(--color-surface-raised)]/40">
              <th className="px-5 py-3 text-center text-[var(--color-text-muted)] font-medium text-xs w-16">{t.rank}</th>
              <th className="px-5 py-3 text-left text-[var(--color-text-muted)] font-medium text-xs">{t.player}</th>
              <th className="px-5 py-3 text-left text-[var(--color-text-muted)] font-medium text-xs">{t.contribution}</th>
              <th className="px-5 py-3 text-right text-[var(--color-text-muted)] font-medium text-xs">{t.amount}</th>
              <th className="px-5 py-3 text-left text-[var(--color-text-muted)] font-medium text-xs">{t.note}</th>
            </tr>
          </thead>
          <tbody>
            {contributions.map((c) => {
              const medal = MEDAL[c.rank]
              const ratio = max > 0 ? c.amount / max : 0

              return (
                <tr
                  key={c.id}
                  className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-raised)] transition-colors"
                >
                  <td className="px-5 py-3 text-center">
                    <span className={[
                      'inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold',
                      medal ? `${medal.bg} ${medal.text} ${medal.ring}` : 'bg-[var(--color-surface-raised)] text-[var(--color-text-muted)]',
                    ].join(' ')}>
                      {c.rank}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-[var(--color-text-primary)]">{c.playerName}</p>
                    {c.playerAlias && <p className="text-xs text-[var(--color-text-muted)]">{c.playerAlias}</p>}
                    {c.rank === 1 && (
                      <span className="text-[0.6rem] text-[var(--color-accent)] font-semibold">{t.selectedTrain}</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 rounded-full bg-[var(--color-surface-raised)] overflow-hidden">
                        <div className="h-full rounded-full bg-[var(--color-success)]" style={{ width: `${Math.round(ratio * 100)}%` }} />
                      </div>
                      <span className="text-xs text-[var(--color-text-muted)] tabular-nums">{Math.round(ratio * 100)}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-[var(--color-text-primary)] tabular-nums">
                    {formatScore(c.amount)}
                  </td>
                  <td className="px-5 py-3 text-xs text-[var(--color-text-muted)]">
                    {c.note ?? '—'}
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
