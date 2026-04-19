import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessionUser, hasPermission } from '@/server/security/authGuard'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { logger } from '@/lib/logger'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user || !hasPermission(user.role, 'admin:view')) {
    logger.warn('Admin area access denied', {
      userId: user?.id ?? null,
      userEmail: user?.email ?? null,
      userRole: user?.role ?? null,
    })
    redirect('/dashboard')
  }

  logger.info('Admin area accessed', {
    userId: user.id,
    userEmail: user.email,
    userRole: user.role,
  })

  return (
    <div className="flex min-h-dvh bg-[var(--color-bg-base)]">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header — visible only below md breakpoint */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] sticky top-0 z-10">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd"/>
            </svg>
            App
          </Link>
          <span className="text-[var(--color-border)]">·</span>
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">Administration</span>
        </header>
        {children}
      </div>
    </div>
  )
}
