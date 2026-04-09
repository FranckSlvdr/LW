import { Card, CardHeader } from '@/components/ui/Card'
import { interpolate, s } from '@/lib/i18n/utils'
import type { Insight } from '@/types/api'
import type { Dictionary } from '@/lib/i18n/types'

interface InsightsPanelProps {
  insights: Insight[]
  dict: Dictionary['insights']
}

const SEVERITY_STYLE = {
  success: {
    bg: 'bg-[var(--color-success-dim)]',
    border: 'border-[var(--color-success)]/20',
    dot: 'bg-[var(--color-success)]',
  },
  info: {
    bg: 'bg-[var(--color-info-dim)]',
    border: 'border-[var(--color-info)]/20',
    dot: 'bg-[var(--color-info)]',
  },
  warning: {
    bg: 'bg-[var(--color-warning-dim)]',
    border: 'border-[var(--color-warning)]/20',
    dot: 'bg-[var(--color-warning)]',
  },
  alert: {
    bg: 'bg-[var(--color-danger-dim)]',
    border: 'border-[var(--color-danger)]/20',
    dot: 'bg-[var(--color-danger)]',
  },
}

export function InsightsPanel({ insights, dict }: InsightsPanelProps) {
  const count    = insights.length
  const subtitle = interpolate(dict.subtitle, { count, s: s(count) })

  return (
    <Card>
      <CardHeader title={dict.title} subtitle={subtitle} />

      {count === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)] py-4 text-center">
          {dict.empty}
        </p>
      ) : (
        <div className="space-y-2">
          {insights.map((insight) => {
            const style = SEVERITY_STYLE[insight.severity]
            return (
              <div
                key={insight.id}
                className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${style.bg} ${style.border}`}
              >
                <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
                <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">
                  {insight.message}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
