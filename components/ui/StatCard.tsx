'use client'

import { formatScoreCompact } from '@/lib/utils'
import { AnimatedNumber } from './AnimatedNumber'

// ─── Serializable prop types ──────────────────────────────────────────────────

/**
 * Serializable key identifying how to format a raw numeric value.
 * Resolved to an actual formatter function inside this Client Component —
 * never passed across the server/client boundary as a function.
 */
export type FormatKey = 'compact' | 'number' | 'percent'

/**
 * Serializable key identifying which KPI icon to render.
 * The actual SVG lives here in the client module.
 */
export type StatIconId = 'lightning' | 'chart' | 'users' | 'check'

type Trend = 'up' | 'down' | 'stable' | null

export interface StatCardProps {
  label: string
  /** Pre-formatted fallback string (shown when rawValue is absent) */
  value: string
  /** Raw number for the animated counter */
  rawValue?: number
  /** How to format rawValue — resolved to a function client-side */
  format?: FormatKey
  subvalue?: string
  /** Serializable icon identifier — rendered client-side */
  iconId?: StatIconId
  trend?: Trend
  trendLabel?: string
  accent?: boolean
}

// ─── Client-side lookup tables ────────────────────────────────────────────────

const FORMAT_FNS: Record<FormatKey, (n: number) => string> = {
  compact: formatScoreCompact,
  number:  String,
  percent: (n) => `${n}%`,
}

const ICONS: Record<StatIconId, React.ReactElement> = {
  lightning: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.381z" clipRule="evenodd" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
    </svg>
  ),
}

const trendConfig = {
  up:     { symbol: '↑', color: 'text-[var(--color-success)]',    bg: 'bg-[var(--color-success-dim)]  border-[var(--color-success)]/15' },
  down:   { symbol: '↓', color: 'text-[var(--color-danger)]',     bg: 'bg-[var(--color-danger-dim)]   border-[var(--color-danger)]/15' },
  stable: { symbol: '→', color: 'text-[var(--color-text-muted)]', bg: 'bg-[var(--color-surface-raised)] border-[var(--color-border)]' },
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StatCard({
  label, value, rawValue, format, subvalue, iconId, trend, trendLabel, accent,
}: StatCardProps) {
  const trendInfo  = trend   ? trendConfig[trend]    : null
  const icon       = iconId  ? ICONS[iconId]         : null
  const formatter  = format  ? FORMAT_FNS[format]    : null

  return (
    <div
      className={[
        'relative rounded-xl border p-5 flex flex-col gap-3 overflow-hidden',
        'card-shadow card-shadow-hover',
        accent
          ? 'gradient-surface-accent border-[var(--color-accent)]/20 card-glow-accent'
          : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-border-subtle)]',
      ].join(' ')}
    >
      {/* Label + icon */}
      <div className="flex items-center justify-between gap-2">
        <span className="label-sm">{label}</span>
        {icon && (
          <div className={[
            'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm',
            accent
              ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
              : 'bg-[var(--color-surface-raised)] text-[var(--color-text-muted)]',
          ].join(' ')}>
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      <div>
        <p className={[
          'text-2xl font-bold tracking-tight leading-none',
          accent ? 'gradient-text' : 'text-[var(--color-text-primary)]',
        ].join(' ')}>
          {rawValue !== undefined && formatter
            ? <AnimatedNumber value={rawValue} format={formatter} />
            : value
          }
        </p>
        {subvalue && (
          <p className="text-xs text-[var(--color-text-secondary)] mt-1.5">{subvalue}</p>
        )}
      </div>

      {/* Trend pill */}
      {trendInfo && trendLabel && (
        <div className={`inline-flex items-center gap-1.5 self-start px-2 py-1 rounded-md border text-xs ${trendInfo.bg}`}>
          <span className={`font-bold ${trendInfo.color}`}>{trendInfo.symbol}</span>
          <span className="text-[var(--color-text-muted)]">{trendLabel}</span>
        </div>
      )}

      {/* Bottom accent bar */}
      {accent && (
        <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-[var(--color-accent)] via-[var(--color-accent-hover)] to-transparent" />
      )}

      {/* Corner ambient glow */}
      {accent && (
        <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full bg-[var(--color-accent)] opacity-[0.08] blur-xl pointer-events-none" />
      )}
    </div>
  )
}
