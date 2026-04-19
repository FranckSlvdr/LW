'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useI18n } from '@/lib/i18n/client'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { LogoutButton } from '@/components/auth/LogoutButton'

interface Props {
  canViewAdmin: boolean
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const IconDashboard = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path d="M2 4a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2H4a2 2 0 01-2-2V4zM11 4a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2h-3a2 2 0 01-2-2V4zM2 13a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2H4a2 2 0 01-2-2v-3zM11 13a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2h-3a2 2 0 01-2-2v-3z"/>
  </svg>
)

const IconVs = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM9 8H4v2h5V8z" clipRule="evenodd"/>
  </svg>
)

const IconPlayers = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
  </svg>
)

const IconTrains = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M5 5a1 1 0 011-1h8a1 1 0 011 1v7a2 2 0 01-2 2H7a2 2 0 01-2-2V5zm3 1a1 1 0 000 2h4a1 1 0 100-2H8zm-1 5a1 1 0 011-1h.01a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd"/>
    <path d="M6 16a1 1 0 100 2h8a1 1 0 100-2H6z"/>
  </svg>
)

const IconMenu = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
  </svg>
)

const IconImports = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd"/>
  </svg>
)

const IconKpi = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
  </svg>
)

const IconSettings = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
  </svg>
)

const IconAdmin = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
  </svg>
)

// ─── Bottom nav item ──────────────────────────────────────────────────────────

interface NavItemProps {
  href: string
  label: string
  icon: React.ReactNode
  isActive: boolean
}

function BottomNavItem({ href, label, icon, isActive }: NavItemProps) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={[
        'flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-colors',
        isActive
          ? 'text-[var(--color-accent)]'
          : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]',
      ].join(' ')}
    >
      <span className={isActive ? 'opacity-100' : 'opacity-60'}>{icon}</span>
      <span className="text-[0.6rem] font-medium leading-none">{label}</span>
    </Link>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MobileBottomNavClient({ canViewAdmin }: Props) {
  const { locale, dict } = useI18n()
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const isFr = locale === 'fr'

  const navItems = [
    { href: '/dashboard', label: dict.nav.dashboard, icon: <IconDashboard /> },
    { href: '/vs',        label: isFr ? 'Scores VS' : 'VS Scores', icon: <IconVs /> },
    { href: '/players',   label: dict.nav.players, icon: <IconPlayers /> },
    { href: '/trains',    label: isFr ? 'Trains' : 'Trains', icon: <IconTrains /> },
  ]

  const drawerItems = [
    { href: '/kpi',      label: isFr ? '📊 Statistiques' : '📊 Statistics', icon: <IconKpi /> },
    { href: '/imports',  label: dict.nav.imports,  icon: <IconImports /> },
    { href: '/settings', label: dict.nav.settings, icon: <IconSettings /> },
    ...(canViewAdmin
      ? [{ href: '/admin', label: isFr ? 'Administration' : 'Administration', icon: <IconAdmin /> }]
      : []),
  ]

  return (
    <>
      {/* ── Bottom navigation bar ─────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden h-16 flex items-stretch border-t border-[var(--color-border)] bg-[var(--color-surface)]">
        {navItems.map((item) => (
          <BottomNavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
          />
        ))}

        {/* Menu button — 5th slot */}
        <button
          onClick={() => setDrawerOpen(true)}
          className={[
            'flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-colors',
            drawerOpen
              ? 'text-[var(--color-accent)]'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]',
          ].join(' ')}
          aria-label={isFr ? 'Ouvrir le menu' : 'Open menu'}
        >
          <span className={drawerOpen ? 'opacity-100' : 'opacity-60'}><IconMenu /></span>
          <span className="text-[0.6rem] font-medium leading-none">{isFr ? 'Menu' : 'Menu'}</span>
        </button>
      </nav>

      {/* ── Drawer overlay — always in DOM, animated via CSS ─────── */}
      <div
        aria-hidden={!drawerOpen}
        className={[
          'fixed inset-0 z-50 md:hidden transition-opacity duration-200',
          drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50"
          onClick={() => setDrawerOpen(false)}
        />

        {/* Sheet — slides up from bottom */}
        <div
          className={[
            'absolute bottom-0 left-0 right-0',
            'bg-[var(--color-surface)] border-t border-[var(--color-border)] rounded-t-2xl',
            'transition-transform duration-300 ease-out',
            drawerOpen ? 'translate-y-0' : 'translate-y-full',
          ].join(' ')}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-[var(--color-border)]" />
          </div>

          {/* Secondary nav links */}
          <div className="px-4 py-2 space-y-1">
            {drawerItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                onClick={() => setDrawerOpen(false)}
                className={[
                  'flex items-center gap-3 px-3 py-3 min-h-[44px] rounded-xl text-sm transition-colors',
                  pathname === item.href || pathname.startsWith(item.href + '/')
                    ? 'bg-[var(--color-accent-dim)] text-[var(--color-accent)] font-medium'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)]',
                ].join(' ')}
              >
                <span className="opacity-70">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>

          {/* Divider */}
          <div className="mx-4 my-2 border-t border-[var(--color-border)]" />

          {/* Language + Logout */}
          <div className="px-4 pb-6 flex items-center justify-between">
            <LanguageSwitcher />
            <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
              <span>{isFr ? 'Déconnexion' : 'Logout'}</span>
              <LogoutButton />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
