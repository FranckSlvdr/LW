import type { ReactNode } from 'react'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent'

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  size?: 'sm' | 'md'
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-[var(--color-success-dim)] text-[var(--color-success)] border-[var(--color-success)]/20',
  warning: 'bg-[var(--color-warning-dim)] text-[var(--color-warning)] border-[var(--color-warning)]/20',
  danger:  'bg-[var(--color-danger-dim)]  text-[var(--color-danger)]  border-[var(--color-danger)]/20',
  info:    'bg-[var(--color-info-dim)]    text-[var(--color-info)]    border-[var(--color-info)]/20',
  accent:  'bg-[var(--color-accent-dim)]  text-[var(--color-accent)]  border-[var(--color-accent)]/20',
  neutral: 'bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] border-[var(--color-border)]',
}

export function Badge({ variant = 'neutral', children, size = 'sm' }: BadgeProps) {
  const sizeClass = size === 'sm'
    ? 'px-2 py-0.5 text-[0.65rem]'
    : 'px-2.5 py-1 text-xs'

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-semibold tracking-wide ${sizeClass} ${variantClasses[variant]}`}
    >
      {children}
    </span>
  )
}
