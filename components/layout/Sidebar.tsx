import { NavLink } from './NavLink'
import { getLocale, getDict } from '@/lib/i18n/server'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { LogoutButton } from '@/components/auth/LogoutButton'
import { getSessionUser } from '@/server/security/authGuard'

const NAV_ICONS = {
  dashboard: (<svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M2 4a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2H4a2 2 0 01-2-2V4zM11 4a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2h-3a2 2 0 01-2-2V4zM2 13a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2H4a2 2 0 01-2-2v-3zM11 13a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2h-3a2 2 0 01-2-2v-3z"/></svg>),
  vs:        (<svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM9 8H4v2h5V8z" clipRule="evenodd"/></svg>),
  players:   (<svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>),
  trains:    (<svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M5 5a1 1 0 011-1h8a1 1 0 011 1v7a2 2 0 01-2 2H7a2 2 0 01-2-2V5zm3 1a1 1 0 000 2h4a1 1 0 100-2H8zm-1 5a1 1 0 011-1h.01a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd"/><path d="M6 16a1 1 0 100 2h8a1 1 0 100-2H6z"/></svg>),
  desert:    (<svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.381z" clipRule="evenodd"/></svg>),
  contribution: (<svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/></svg>),
  imports:   (<svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd"/></svg>),
  settings:  (<svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/></svg>),
} as const

export async function Sidebar() {
  const [locale, user] = await Promise.all([getLocale(), getSessionUser()])
  const dict = await getDict(locale)
  const nav  = dict.nav
  const app  = dict.app

  const NAV_ITEMS = [
    { href: '/dashboard',     label: nav.dashboard,    icon: NAV_ICONS.dashboard,     section: null },
    { href: '/vs',            label: '⚔️ Scores VS',   icon: NAV_ICONS.vs,            section: null },
    { href: '/players',       label: nav.players,      icon: NAV_ICONS.players,       section: null },
    { href: '/imports',       label: nav.imports,      icon: NAV_ICONS.imports,       section: null },
    { href: '/trains',        label: '🚂 Trains',       icon: NAV_ICONS.trains,        section: 'game' },
    { href: '/desert-storm',  label: '🌪️ Desert Storm', icon: NAV_ICONS.desert,        section: 'game' },
    { href: '/contribution',  label: '💰 Contribution', icon: NAV_ICONS.contribution,  section: 'game' },
    { href: '/settings',      label: nav.settings,     icon: NAV_ICONS.settings,      section: 'config' },
    { href: '/admin',         label: 'Administration', icon: NAV_ICONS.settings,      section: 'config' },
  ]

  return (
    <aside className="w-56 shrink-0 flex flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] h-dvh sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg gradient-surface-accent border border-[var(--color-accent)]/20 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-[var(--color-accent)]">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.381z" clipRule="evenodd"/>
            </svg>
          </div>
          <div>
            <h1 className="text-[0.8rem] font-bold text-[var(--color-text-primary)] tracking-tight leading-none">{app.name}</h1>
            <p className="label-xs mt-0.5">{app.tagline}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        {/* Core */}
        {NAV_ITEMS.filter((i) => !i.section).map((item) => (
          <NavLink key={item.href} href={item.href} icon={item.icon} label={item.label} />
        ))}

        {/* Game modules */}
        <p className="px-2 pt-3 pb-1 text-[0.6rem] text-[var(--color-text-muted)] uppercase tracking-widest font-semibold">
          Modules
        </p>
        {NAV_ITEMS.filter((i) => i.section === 'game').map((item) => (
          <NavLink key={item.href} href={item.href} icon={item.icon} label={item.label} />
        ))}

        {/* Config */}
        <p className="px-2 pt-3 pb-1 text-[0.6rem] text-[var(--color-text-muted)] uppercase tracking-widest font-semibold">
          Config
        </p>
        {NAV_ITEMS.filter((i) => i.section === 'config').map((item) => (
          <NavLink key={item.href} href={item.href} icon={item.icon} label={item.label} />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-[var(--color-border)] space-y-2">
        {/* User identity + logout */}
        {user && (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
            {/* Avatar */}
            <div className="w-6 h-6 rounded-full bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/30 flex items-center justify-center shrink-0">
              <span className="text-[0.55rem] font-bold text-[var(--color-accent)] uppercase">
                {user.name.charAt(0)}
              </span>
            </div>
            {/* Name */}
            <div className="flex-1 min-w-0">
              <p className="text-[0.65rem] font-medium text-[var(--color-text-primary)] truncate leading-none">
                {user.name}
              </p>
              <p className="text-[0.55rem] text-[var(--color-text-muted)] truncate leading-none mt-0.5">
                {user.role}
              </p>
            </div>
            {/* Logout */}
            <LogoutButton />
          </div>
        )}

        {/* Language + live badge */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1 text-[0.6rem] text-[var(--color-success)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] animate-pulse-dot" />
            {app.live}
          </div>
          <LanguageSwitcher />
        </div>
      </div>
    </aside>
  )
}
