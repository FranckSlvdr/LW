import { redirect } from 'next/navigation'
import { getSessionUser, hasPermission } from '@/server/security/authGuard'
import { AdminSidebar } from '@/components/layout/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user || !hasPermission(user.role, 'admin:view')) {
    redirect('/dashboard')
  }

  return (
    <div className="flex min-h-dvh bg-[var(--color-bg-base)]">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {children}
      </div>
    </div>
  )
}
