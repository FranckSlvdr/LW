import { Card, CardHeader } from '@/components/ui/Card'

export interface LevelBucket {
  level: number
  count: number
}

interface Props {
  buckets: LevelBucket[]
}

export function LevelDistributionPanel({ buckets }: Props) {
  if (buckets.length === 0) return null

  const max = Math.max(...buckets.map((b) => b.count), 1)
  const total = buckets.reduce((s, b) => s + b.count, 0)
  const avgLevel = total > 0
    ? Math.round(buckets.reduce((s, b) => s + b.level * b.count, 0) / total)
    : 0

  return (
    <Card>
      <CardHeader
        title="Niveaux des joueurs"
        subtitle={`${total} joueurs · niveau moyen ${avgLevel}`}
      />

      <div className="mt-3 space-y-1.5">
        {buckets.map((b) => {
          const pct = (b.count / max) * 100
          return (
            <div key={b.level} className="flex items-center gap-3">
              <span className="w-12 text-right text-xs font-mono font-semibold text-[var(--color-text-muted)] shrink-0">
                Nv. {b.level}
              </span>
              <div className="flex-1 h-5 rounded bg-[var(--color-surface-raised)] overflow-hidden">
                <div
                  className="h-full rounded bg-[var(--color-accent)] transition-all duration-500 flex items-center px-2"
                  style={{ width: `${pct.toFixed(1)}%` }}
                />
              </div>
              <span className="w-6 text-right text-xs font-bold text-[var(--color-text-primary)] tabular-nums shrink-0">
                {b.count}
              </span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
