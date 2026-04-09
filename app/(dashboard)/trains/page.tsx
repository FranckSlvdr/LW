import { TopBar } from '@/components/layout/TopBar'
import { TrainSelector } from '@/features/trains/components/TrainSelector'
import { TrainHistory } from '@/features/trains/components/TrainHistory'
import { TrainSettingsPanel } from '@/features/trains/components/TrainSettingsPanel'
import { getTrainSettings, getTrainRunsForWeek, getRecentTrainHistory } from '@/server/services/trainService'
import { getAllWeeks } from '@/server/services/weekService'
import { getSessionUser, hasPermission } from '@/server/security/authGuard'
import { getLocale, getDict } from '@/lib/i18n/server'
import { perf } from '@/lib/perf'

interface PageProps {
  searchParams: Promise<{ weekId?: string }>
}

export default async function TrainsPage({ searchParams }: PageProps) {
  const done = perf('TrainsPage')
  const { weekId: weekIdParam } = await searchParams

  // Group 1: locale + structural data — all independent, run in parallel
  // (was: 4 sequential awaits — locale → dict → weeks → user)
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

  const [settings, runsForWeek, history] = await Promise.all([
    getTrainSettings(),
    validWeekId ? getTrainRunsForWeek(validWeekId) : Promise.resolve([]),
    getRecentTrainHistory(14),
  ])
  done()

  return (
    <>
      <TopBar weeks={weeks} selectedWeekId={validWeekId} title={dict.trains.pageTitle} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main column: selector + week results */}
            <div className={canConfigure ? 'lg:col-span-2 space-y-6' : 'lg:col-span-3 space-y-6'}>
              <TrainSelector
                weekId={validWeekId}
                weekLabel={weeks.find((w) => w.id === validWeekId)?.label ?? ''}
                settings={settings}
                existingRuns={runsForWeek}
                canTrigger={canTrigger}
              />
            </div>

            {/* Side column: settings — admin+ only */}
            {canConfigure && (
              <div>
                <TrainSettingsPanel settings={settings} />
              </div>
            )}
          </div>

          {/* History */}
          <TrainHistory runs={history} />

        </div>
      </main>
    </>
  )
}
