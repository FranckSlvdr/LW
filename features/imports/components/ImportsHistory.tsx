import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { interpolate } from '@/lib/i18n/utils'
import { getImportsMessages } from '@/features/imports/messages'
import type { Import } from '@/types/domain'
import type { Dictionary } from '@/lib/i18n/types'

interface ImportsHistoryProps {
  imports: Import[]
  locale: string
  dict: Dictionary['imports']
}

export function ImportsHistory({ imports, locale, dict }: ImportsHistoryProps) {
  const messages = getImportsMessages(locale === 'fr' ? 'fr' : 'en').history
  const statusBadge = {
    success: { variant: 'success' as const, label: dict.statusSuccess },
    partial: { variant: 'warning' as const, label: dict.statusPartial },
    error:   { variant: 'danger'  as const, label: dict.statusError },
    pending: { variant: 'neutral' as const, label: dict.statusPending },
  }

  const typeLabel: Record<string, string> = {
    players: dict.typePlayers,
    scores:  dict.typeScores,
  }

  return (
    <Card padding="none">
      <div className="p-5 pb-3">
        <CardHeader
          title={dict.title}
          subtitle={messages.subtitle(imports.length)}
        />
      </div>

      {imports.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-[var(--color-text-muted)]">{dict.empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-[var(--color-border)] bg-[var(--color-surface-raised)]/40">
                <th className="px-5 py-3 text-left text-[var(--color-text-muted)] font-medium text-xs">{messages.columns.file}</th>
                <th className="px-5 py-3 text-center text-[var(--color-text-muted)] font-medium text-xs">{messages.columns.type}</th>
                <th className="px-5 py-3 text-center text-[var(--color-text-muted)] font-medium text-xs">{messages.columns.lines}</th>
                <th className="px-5 py-3 text-center text-[var(--color-text-muted)] font-medium text-xs">{messages.columns.status}</th>
                <th className="px-5 py-3 text-right text-[var(--color-text-muted)] font-medium text-xs">{messages.columns.date}</th>
              </tr>
            </thead>
            <tbody>
              {imports.map((imp) => {
                const badge       = statusBadge[imp.status]
                const successRate = imp.rowsTotal > 0
                  ? Math.round((imp.rowsImported / imp.rowsTotal) * 100)
                  : 0

                return (
                  <tr
                    key={imp.id}
                    className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-raised)] transition-colors"
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-[var(--color-text-primary)] truncate max-w-[240px]">
                        {imp.filename ?? `${dict.importPrefix}${typeLabel[imp.importType] ?? imp.importType}`}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="text-base">{imp.importType === 'scores' ? '📊' : '👥'}</span>
                      <span className="ml-1.5 text-xs text-[var(--color-text-muted)]">{typeLabel[imp.importType]}</span>
                    </td>
                    <td className="px-5 py-3 text-center text-xs text-[var(--color-text-muted)]">
                      <span className="font-bold text-[var(--color-text-primary)]">{successRate}%</span>
                      <span className="block">
                        {interpolate(dict.lines, { imported: imp.rowsImported, total: imp.rowsTotal })}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </td>
                    <td className="px-5 py-3 text-right text-xs text-[var(--color-text-muted)] tabular-nums">
                      {new Date(imp.createdAt).toLocaleDateString(
                        locale === 'fr' ? 'fr-FR' : 'en-GB',
                        { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' },
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
