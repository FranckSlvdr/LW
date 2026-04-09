import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  /** Elevated cards have a slightly lighter background */
  elevated?: boolean
  padding?: 'sm' | 'md' | 'lg' | 'none'
}

const paddingClass = { sm: 'p-4', md: 'p-5', lg: 'p-6', none: '' }

export function Card({ children, className = '', elevated = false, padding = 'md' }: CardProps) {
  return (
    <div
      className={[
        'rounded-xl border',
        elevated
          ? 'bg-[var(--color-surface-raised)] border-[var(--color-border)]'
          : 'bg-[var(--color-surface)] border-[var(--color-border)]',
        paddingClass[padding],
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h3>
        {subtitle && (
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
