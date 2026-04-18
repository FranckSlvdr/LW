import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { getSessionUser } from '@/server/security/authGuard'

// Allow up to 30s for any dashboard page — DB queries + KPI computation
// can exceed the default 10s Vercel timeout on cold starts.
export const maxDuration = 30

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--color-bg-base)]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}
