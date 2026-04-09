import { Card, CardHeader } from '@/components/ui/Card'
import { formatScore } from '@/lib/utils'
import type { DesertStormScoreApi } from '@/types/api'

interface DesertStormTableProps {
  scores: DesertStormScoreApi[]
  includeDsTop2?: boolean
}

const MEDAL: Record<number, { bg: string; text: string; ring: string }> = {
  1: { bg: 'bg-[#f59e0b]/15', text: 'text-[#f59e0b]', ring: 'ring-1 ring-[#f59e0b]/30' },
  2: { bg: 'bg-[#94a3b8]/15', text: 'text-[#94a3b8]', ring: 'ring-1 ring-[#94a3b8]/25' },
  3: { bg: 'bg-[#b45309]/15', text: 'text-[#cd7c2f]', ring: 'ring-1 ring-[#b45309]/25' },
}

export function DesertStormTable({ scores, includeDsTop2 = false }: DesertStormTableProps) {
  if (scores.length === 0) {
    return (
      <Card>
        <div className="py-12 text-center space-y-2">
          <p className="text-3xl opacity-30">🌪️</p>
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">Aucun score Desert Storm enregistré</p>
          <p className="text-xs text-[var(--color-text-muted)]">Utilisez le formulaire ci-dessus pour saisir les scores</p>
        </div>
      </Card>
    )
  }

  const maxScore = scores[0]?.score ?? 1

  return (
    <Card padding="none">
      <div className="p-5 pb-3">
        <CardHeader
          title="Classement Desert Storm"
          subtitle={`${scores.length} joueur${scores.length > 1 ? 's' : ''} · semaine en cours`}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-[var(--color-border)] bg-[var(--color-surface-raised)]/40">
              <th className="px-5 py-3 text-center text-[var(--color-text-muted)] font-medium text-xs w-16">Rang</th>
              <th className="px-5 py-3 text-left text-[var(--color-text-muted)] font-medium text-xs">Joueur</th>
              <th className="px-5 py-3 text-left text-[var(--color-text-muted)] font-medium text-xs">Score</th>
              <th className="px-5 py-3 text-right text-[var(--color-text-muted)] font-medium text-xs">Points</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((s) => {
              const medal = MEDAL[s.rank]
              const ratio = maxScore > 0 ? s.score / maxScore : 0

              return (
                <tr
                  key={s.id}
                  className={[
                    'border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-raised)] transition-colors',
                    s.rank <= 2 ? 'bg-[var(--color-surface-raised)]/20' : '',
                  ].join(' ')}
                >
                  <td className="px-5 py-3 text-center">
                    <span className={[
                      'inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold',
                      medal ? `${medal.bg} ${medal.text} ${medal.ring}` : 'bg-[var(--color-surface-raised)] text-[var(--color-text-muted)]',
                    ].join(' ')}>
                      {s.rank}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-[var(--color-text-primary)]">{s.playerName}</p>
                    {s.playerAlias && (
                      <p className="text-xs text-[var(--color-text-muted)]">{s.playerAlias}</p>
                    )}
                    {includeDsTop2 && s.rank <= 2 && (
                      <span className="text-[0.6rem] text-[var(--color-accent)] font-semibold">⭐ Sélectionné train</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 rounded-full bg-[var(--color-surface-raised)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[var(--color-accent)]"
                          style={{ width: `${Math.round(ratio * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-[var(--color-text-muted)] tabular-nums">
                        {Math.round(ratio * 100)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-[var(--color-text-primary)] tabular-nums">
                    {formatScore(s.score)}
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
