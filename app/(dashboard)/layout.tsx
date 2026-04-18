import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { getSessionUser } from '@/server/security/authGuard'

// Allow up to 60s for dashboard pages. Production logs showed occasional
// timeouts on cold starts for KPI-heavy pages behind this layout.
export const maxDuration = 60

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--color-bg-base)]">
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}
