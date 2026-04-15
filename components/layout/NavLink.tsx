'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavLinkProps {
  href: string
  icon: ReactNode
  label: string
}

export function NavLink({ href, icon, label }: NavLinkProps) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      className={[
        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150',
        isActive
          ? 'bg-[var(--color-accent-dim)] text-[var(--color-accent)] font-medium border border-[var(--color-accent)]/15'
          : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)] border border-transparent',
      ].join(' ')}
    >
      <span className={['shrink-0 transition-opacity', isActive ? 'opacity-100' : 'opacity-50'].join(' ')}>
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      {isActive && (
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] shrink-0" />
      )}
    </Link>
  )
}
