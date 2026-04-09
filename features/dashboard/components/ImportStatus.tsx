import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { interpolate } from '@/lib/i18n/utils'
import type { Import } from '@/types/domain'
import type { Dictionary } from '@/lib/i18n/types'

interface ImportStatusProps {
  imports: Import[]
  dict: Dictionary['imports']
  locale: string
}

export function ImportStatus({ imports, dict, locale }: ImportStatusProps) {
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
    <Card>
      <CardHeader title={dict.title} subtitle={dict.subtitle} />

      {imports.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)] py-4 text-center">
          {dict.empty}
        </p>
      ) : (
        <div className="space-y-2">
          {imports.map((imp) => {
            const badge       = statusBadge[imp.status]
            const successRate = imp.rowsTotal > 0
              ? Math.round((imp.rowsImported / imp.rowsTotal) * 100)
              : 0

            return (
              <div
                key={imp.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--color-surface-raised)] transition-colors"
              >
                <span className="text-base shrink-0 opacity-60">
                  {imp.importType === 'scores' ? '📊' : '👥'}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                    {imp.filename ?? `${dict.importPrefix}${typeLabel[imp.importType] ?? imp.importType}`}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {interpolate(dict.lines, { imported: imp.rowsImported, total: imp.rowsTotal })}
                    {imp.rowsSkipped > 0 && ` ${interpolate(dict.skipped, { n: imp.rowsSkipped })}`}
                    {' · '}
                    {new Date(imp.createdAt).toLocaleDateString(
                      locale === 'fr' ? 'fr-FR' : 'en-GB',
                      { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' },
                    )}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-[var(--color-text-primary)]">{successRate}%</p>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
