import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatScore } from '@/lib/utils'
import { interpolate, s } from '@/lib/i18n/utils'
import type { EventApi } from '@/types/api'
import type { Dictionary } from '@/lib/i18n/types'

interface EventsTableProps {
  events: EventApi[]
  dict: Dictionary['events']
  locale: string
}

export function EventsTable({ events, dict, locale }: EventsTableProps) {
  if (events.length === 0) {
    return (
      <Card>
        <div className="py-12 text-center space-y-2">
          <p className="text-3xl opacity-30">🎯</p>
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">{dict.empty}</p>
          <p className="text-xs text-[var(--color-text-muted)]">{dict.emptyHint}</p>
        </div>
      </Card>
    )
  }

  const count    = events.length
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
              <th className="px-5 py-3 text-left text-[var(--color-text-muted)] font-medium text-xs">{dict.colEvent}</th>
              <th className="px-5 py-3 text-center text-[var(--color-text-muted)] font-medium text-xs">{dict.colDate}</th>
              <th className="px-5 py-3 text-right text-[var(--color-text-muted)] font-medium text-xs">{dict.colScore}</th>
              <th className="px-5 py-3 text-center text-[var(--color-text-muted)] font-medium text-xs">{dict.colStatus}</th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => (
              <tr
                key={ev.id}
                className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-raised)] transition-colors"
              >
                <td className="px-5 py-3 font-medium text-[var(--color-text-primary)]">
                  {ev.playerName}
                </td>
                <td className="px-5 py-3 text-[var(--color-text-secondary)]">
                  {ev.eventName}
                </td>
                <td className="px-5 py-3 text-center text-[var(--color-text-muted)] text-xs tabular-nums">
                  {new Date(ev.eventDate).toLocaleDateString(
                    locale === 'fr' ? 'fr-FR' : 'en-GB',
                    { day: '2-digit', month: 'short', year: 'numeric' },
                  )}
                </td>
                <td className="px-5 py-3 text-right font-bold text-[var(--color-text-primary)] tabular-nums">
                  {ev.participated ? formatScore(ev.score) : '—'}
                </td>
                <td className="px-5 py-3 text-center">
                  <Badge variant={ev.participated ? 'success' : 'neutral'}>
                    {ev.participated ? dict.statusParticipated : dict.statusAbsent}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
