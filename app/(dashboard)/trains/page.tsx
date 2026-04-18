import { Suspense } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { TrainSelector } from '@/features/trains/components/TrainSelector'
import { TrainHistoryLoader } from '@/features/trains/components/TrainHistoryLoader'
import { TrainSettingsPanel } from '@/features/trains/components/TrainSettingsPanel'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { getTrainSettings, getTrainRunsForWeek } from '@/server/services/trainService'
import { getAllWeeks } from '@/server/services/weekService'
import { getSessionUser, hasPermission } from '@/server/security/authGuard'
import { getLocale, getDict } from '@/lib/i18n/server'
export const maxDuration = 60

interface PageProps {
  searchParams: Promise<{ weekId?: string }>
}

async function TrainsContent({
  weekId,
  weekLabel,
  canTrigger,
  canConfigure,
}: {
  weekId: number
  weekLabel: string
  canTrigger: boolean
  canConfigure: boolean
}) {
  const [settings, runsForWeek] = await Promise.all([
    getTrainSettings(),
    weekId ? getTrainRunsForWeek(weekId) : Promise.resolve([]),
  ])

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={canConfigure ? 'lg:col-span-2 space-y-6' : 'lg:col-span-3 space-y-6'}>
            <TrainSelector
              weekId={weekId}
              weekLabel={weekLabel}
              settings={settings}
              existingRuns={runsForWeek}
              canTrigger={canTrigger}
            />
          </div>
          {canConfigure && (
            <div>
              <TrainSettingsPanel settings={settings} />
            </div>
          )}
        </div>

        <TrainHistoryLoader limit={14} />

      </div>
    </main>
  )
}

function TrainsSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <SkeletonCard lines={8} />
          </div>
          <SkeletonCard lines={6} />
        </div>
        <SkeletonCard lines={10} />
      </div>
    </div>
  )
}

export default async function TrainsPage({ searchParams }: PageProps) {
  const { weekId: weekIdParam } = await searchParams
  const [locale, weeks, user] = await Promise.all([
    getLocale(),
    getAllWeeks(),
    getSessionUser(),
  ])
  const dict = await getDict(locale)

  const canTrigger   = user ? hasPermission(user.role, 'trains:trigger')   : false
  const canConfigure = user ? hasPermission(user.role, 'trains:configure') : false

  const selectedWeekId = weekIdParam ? Number(weekIdParam) : weeks[0]?.id ?? 0
  const validWeekId    = weeks.find((w) => w.id === selectedWeekId)?.id ?? weeks[0]?.id ?? 0
  const weekLabel      = weeks.find((w) => w.id === validWeekId)?.label ?? ''

  return (
    <>
      <TopBar weeks={weeks} selectedWeekId={validWeekId} title={dict.trains.pageTitle} />
      <Suspense fallback={<TrainsSkeleton />}>
        <TrainsContent
          weekId={validWeekId}
          weekLabel={weekLabel}
          canTrigger={canTrigger}
          canConfigure={canConfigure}
        />
      </Suspense>
    </>
  )
}
