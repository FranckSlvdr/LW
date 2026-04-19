'use client'

import { Card } from '@/components/ui/Card'
import { useI18n } from '@/lib/i18n/client'
import type { PlayerRating } from '@/types/domain'

interface RatingResultTableProps {
  ratings: PlayerRating[]
  playerMap: Map<number, { name: string; alias: string | null }>
}

const MEDAL: Record<number, { bg: string; text: string; ring: string }> = {
  1: { bg: 'bg-[#f59e0b]/15', text: 'text-[#f59e0b]', ring: 'ring-1 ring-[#f59e0b]/30' },
  2: { bg: 'bg-[#94a3b8]/15', text: 'text-[#94a3b8]', ring: 'ring-1 ring-[#94a3b8]/25' },
  3: { bg: 'bg-[#b45309]/15', text: 'text-[#cd7c2f]', ring: 'ring-1 ring-[#b45309]/25' },
}

function Bar({ value, color = 'var(--color-accent)' }: { value: number | null; color?: string }) {
  if (value === null) return <span className="text-[var(--color-text-muted)] text-xs">{'\u2014'}</span>
  const pct = Math.round(value * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-[var(--color-surface-raised)] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs tabular-nums text-[var(--color-text-muted)]">{pct}%</span>
    </div>
  )
}

const sorted = (ratings: PlayerRating[]) =>
  [...ratings].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))

export function RatingResultTable({ ratings, playerMap }: RatingResultTableProps) {
  const { locale } = useI18n()
  const isFrench = locale === 'fr'

  return (
    <Card padding="none">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-[var(--color-border)] bg-[var(--color-surface-raised)]/40">
              <th className="px-5 py-3 text-center text-[var(--color-text-muted)] font-medium text-xs w-16">{isFrench ? 'Rang' : 'Rank'}</th>
              <th className="px-5 py-3 text-left text-[var(--color-text-muted)] font-medium text-xs">{isFrench ? 'Joueur' : 'Player'}</th>
              <th className="px-5 py-3 text-right text-[var(--color-text-muted)] font-medium text-xs">{isFrench ? 'Note finale' : 'Final rating'}</th>
              <th className="px-5 py-3 text-left text-[var(--color-text-muted)] font-medium text-xs">{isFrench ? 'Score VS' : 'VS score'}</th>
              <th className="px-5 py-3 text-left text-[var(--color-text-muted)] font-medium text-xs">{isFrench ? 'Regularite' : 'Regularity'}</th>
              <th className="px-5 py-3 text-left text-[var(--color-text-muted)] font-medium text-xs">{isFrench ? 'Participation' : 'Participation'}</th>
              <th className="px-5 py-3 text-center text-[var(--color-text-muted)] font-medium text-xs">{isFrench ? 'Bonus/Malus' : 'Bonus/Penalty'}</th>
            </tr>
          </thead>
          <tbody>
            {sorted(ratings).map((rating) => {
              const player = playerMap.get(rating.playerId)
              const medal = rating.rank ? MEDAL[rating.rank] : undefined
              const score = rating.finalScore != null ? Math.round(rating.finalScore) : null

              return (
                <tr
                  key={rating.id}
                  className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-raised)] transition-colors"
                >
                  <td className="px-5 py-3 text-center">
                    <span
                      className={[
                        'inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold',
                        medal ? `${medal.bg} ${medal.text} ${medal.ring}` : 'bg-[var(--color-surface-raised)] text-[var(--color-text-muted)]',
                      ].join(' ')}
                    >
                      {rating.rank ?? '\u2014'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-[var(--color-text-primary)]">
                      {player?.name ?? `Player ${rating.playerId}`}
                    </p>
                    {player?.alias && (
                      <p className="text-xs text-[var(--color-text-muted)]">{player.alias}</p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {score !== null ? (
                      <span className="text-xl font-bold gradient-text">{score}</span>
                    ) : (
                      <span className="text-[var(--color-text-muted)]">{'\u2014'}</span>
                    )}
                    <span className="text-xs text-[var(--color-text-muted)] ml-0.5">/100</span>
                  </td>
                  <td className="px-5 py-3">
                    <Bar value={rating.rawVsScore} color="var(--color-accent)" />
                  </td>
                  <td className="px-5 py-3">
                    <Bar value={rating.regularity} color="var(--color-success)" />
                  </td>
                  <td className="px-5 py-3">
                    <Bar value={rating.participation} color="var(--color-info)" />
                  </td>
                  <td className="px-5 py-3 text-center text-xs tabular-nums">
                    {rating.bonusMalus !== 0 ? (
                      <span className={rating.bonusMalus > 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}>
                        {rating.bonusMalus > 0 ? '+' : ''}{rating.bonusMalus}
                      </span>
                    ) : (
                      <span className="text-[var(--color-text-muted)]">0</span>
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
