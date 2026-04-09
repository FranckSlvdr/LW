import type { Locale } from './config'

/** Format a date to a short localized string, e.g. "02 mars 2025" / "Mar 02, 2025" */
export function formatDate(
  date: string | Date,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' },
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-GB', options)
}

/** Format a date+time inline, e.g. "02 mars · 14:30" */
export function formatDateTime(date: string | Date, locale: Locale): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
