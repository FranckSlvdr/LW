import { Suspense } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { DesertStormManageForm } from '@/features/desert-storm/components/DesertStormManageForm'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { getDsRegistrationsForWeek } from '@/server/services/desertStormService'
import { getAllWeeks } from '@/server/services/weekService'
import { getAllPlayers } from '@/server/services/playerService'
import { getSessionUser, hasPermission } from '@/server/security/authGuard'
import { getLocale, getDict } from '@/lib/i18n/server'
import type { Dictionary } from '@/lib/i18n/types'

interface PageProps {
  searchParams: Promise<{ weekId?: string }>
}

async function DesertStormContent({
  weekId,
  canEdit,
  dict,
}: {
  weekId: number
  canEdit: boolean
  dict: Dictionary
}) {
  const t = dict.desertStorm
  const [players, registrations] = await Promise.all([
    getAllPlayers(true),
    weekId ? getDsRegistrationsForWeek(weekId) : Promise.resolve([]),
  ])

  const teamA     = registrations.filter((r) => r.team === 'A')
  const teamB     = registrations.filter((r) => r.team === 'B')
  const absents   = registrations.filter((r) => !r.present).length

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-6">

        {/* KPI pills */}
        <div className="grid grid-cols-3 gap-4 stagger">
          <StatPill label={t.statTeamA} value={`${teamA.length}`} />
          <StatPill label={t.statTeamB} value={`${teamB.length}`} />
          <StatPill label={t.statAbsent} value={`${absents}`} />
        </div>

        <DesertStormManageForm
          weekId={weekId}
          players={players}
          registrations={registrations}
          canEdit={canEdit}
        />

      </div>
    </main>
  )
}

function DesertStormSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <SkeletonCard lines={1} />
          <SkeletonCard lines={1} />
          <SkeletonCard lines={1} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonCard lines={14} />
          <SkeletonCard lines={14} />
        </div>
      </div>
    </div>
  )
}

export default async function DesertStormPage({ searchParams }: PageProps) {
  const { weekId: weekIdParam } = await searchParams
  const [locale, weeks, user] = await Promise.all([
    getLocale(),
    getAllWeeks(),
    getSessionUser(),
  ])
  const dict    = await getDict(locale)
  const canEdit = user ? hasPermission(user.role, 'scores:edit') : false

  const selectedWeekId = weekIdParam ? Number(weekIdParam) : weeks[0]?.id ?? 0
  const validWeekId    = weeks.find((w) => w.id === selectedWeekId)?.id ?? weeks[0]?.id ?? 0

  return (
    <>
      <TopBar weeks={weeks} selectedWeekId={validWeekId} title={dict.desertStorm.pageTitle} />
      <Suspense fallback={<DesertStormSkeleton />}>
        <DesertStormContent
          weekId={validWeekId}
          canEdit={canEdit}
          dict={dict}
        />
      </Suspense>
    </>
  )
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 card-shadow">
      <p className="label-sm mb-1">{label}</p>
      <p className="text-2xl font-bold text-[var(--color-text-primary)]">{value}</p>
    </div>
  )
}
