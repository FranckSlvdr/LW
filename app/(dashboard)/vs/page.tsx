import { TopBar } from '@/components/layout/TopBar'
import { KpiCards } from '@/features/dashboard/components/KpiCards'
import { TopFlopPanel } from '@/features/dashboard/components/TopFlopPanel'
import { ScoreHeatmap } from '@/features/dashboard/components/ScoreHeatmap'
import { InsightsPanel } from '@/features/dashboard/components/InsightsPanel'
import { DailyScoresForm } from '@/features/vs/components/DailyScoresForm'
import { EcoDayBar } from '@/features/vs/components/EcoDayBar'
import { getDashboardData } from '@/server/services/kpiService'
import { getVsDaysForWeek } from '@/server/services/vsDayService'
import { getAllWeeks } from '@/server/services/weekService'
import { getAllPlayers } from '@/server/services/playerService'
import { getSessionUser, hasPermission } from '@/server/security/authGuard'
import { getLocale, getDict } from '@/lib/i18n/server'
import { interpolate } from '@/lib/i18n/utils'
import { perf } from '@/lib/perf'

interface PageProps {
  searchParams: Promise<{ weekId?: string }>
}

export default async function VsPage({ searchParams }: PageProps) {
  const done = perf('VsPage')
  const { weekId: weekIdParam } = await searchParams

  // Group 1: auth + structural data — all independent, run in parallel
  const [locale, weeks, players, user] = await Promise.all([
    getLocale(),
    getAllWeeks(),
    getAllPlayers(true),
    getSessionUser(),
  ])
  const canEdit = user ? hasPermission(user.role, 'scores:import') : false
  const canEco  = user ? hasPermission(user.role, 'scores:edit')   : false

  if (weeks.length === 0) {
    const dict = await getDict(locale)
    return <EmptyState message={dict.dashboard.noWeeks} hint={dict.dashboard.noWeeksHint} />
  }

  const selectedWeekId = weekIdParam ? Number(weekIdParam) : weeks[0]!.id
  const validWeekId    = weeks.find((w) => w.id === selectedWeekId)?.id ?? weeks[0]!.id
  const currentWeek    = weeks.find((w) => w.id === validWeekId)!

  // Group 2: i18n dict + heavy data — run in parallel.
  // getDict (dynamic import) no longer blocks the DB calls.
  const [dict, dashboardData, vsDays] = await Promise.all([
    getDict(locale),
    getDashboardData(validWeekId),
    getVsDaysForWeek(validWeekId),
  ])
  done()

  const d = dict.dashboard
  const { summary, allKpis, insights } = dashboardData

  // Derive existing scores from allKpis (already loaded inside getDashboardData)
  const existingScores = allKpis.flatMap((kpi) =>
    kpi.dailyScores
      .filter((ds) => ds.score > 0)
      .map((ds) => ({
        playerId:   kpi.playerId,
        dayOfWeek:  ds.dayOfWeek as number,
        score:      ds.score,
      })),
  )

  if (allKpis.length === 0) {
    return (
      <>
        <TopBar weeks={weeks} selectedWeekId={validWeekId} title="Scores VS" />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
            {/* Eco day bar always visible */}
            <EcoDayBar weekId={validWeekId} vsDays={vsDays} canEdit={canEco} />

            {canEdit && (
              <DailyScoresForm
                weekId={validWeekId}
                weekLabel={currentWeek.label}
                players={players}
                existingScores={existingScores}
                ecoDays={vsDays}
              />
            )}
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <TopBar weeks={weeks} selectedWeekId={validWeekId} title="Scores VS" />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">

          {/* Eco day controls — always visible, editable by scores:edit */}
          <EcoDayBar weekId={validWeekId} vsDays={vsDays} canEdit={canEco} />

          <section>
            <KpiCards
              summary={summary}
              totalRegisteredPlayers={players.length}
              dict={dict.kpi}
            />
          </section>

          <section>
            <TopFlopPanel
              topPlayers={summary.topPlayers}
              flopPlayers={summary.flopPlayers}
              dict={dict.topFlop}
            />
          </section>

          <section>
            <ScoreHeatmap kpis={allKpis} dict={dict.heatmap} />
          </section>

          {canEdit && (
            <section>
              <DailyScoresForm
                weekId={validWeekId}
                weekLabel={currentWeek.label}
                players={players}
                existingScores={existingScores}
                ecoDays={vsDays}
              />
            </section>
          )}

          {insights.length > 0 && (
            <section>
              <InsightsPanel insights={insights} dict={dict.insights} />
            </section>
          )}

        </div>
      </main>
    </>
  )
}

function EmptyState({ message, hint }: { message: string; hint: string }) {
  return (
    <main className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-3 max-w-sm px-6">
        <div className="text-5xl">📭</div>
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{message}</h2>
        <p className="text-sm text-[var(--color-text-secondary)]">{hint}</p>
      </div>
    </main>
  )
}
