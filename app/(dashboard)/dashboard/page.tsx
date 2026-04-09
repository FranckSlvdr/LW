import { TopBar } from '@/components/layout/TopBar'
import { KpiCards } from '@/features/dashboard/components/KpiCards'
import { TopFlopPanel } from '@/features/dashboard/components/TopFlopPanel'
import { ScoreHeatmap } from '@/features/dashboard/components/ScoreHeatmap'
import { InsightsPanel } from '@/features/dashboard/components/InsightsPanel'
import { ImportStatus } from '@/features/dashboard/components/ImportStatus'
import { RankingTable } from '@/features/dashboard/components/RankingTable'
import { getDashboardData } from '@/server/services/kpiService'
import { getAllWeeks } from '@/server/services/weekService'
import { getRecentImports } from '@/server/services/importService'
import { getLocale, getDict } from '@/lib/i18n/server'
import { interpolate } from '@/lib/i18n/utils'

interface DashboardPageProps {
  searchParams: Promise<{ weekId?: string }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { weekId: weekIdParam } = await searchParams

  const [locale, weeks] = await Promise.all([
    getLocale(),
    getAllWeeks(),
  ])

  const dict = await getDict(locale)
  const d    = dict.dashboard

  if (weeks.length === 0) {
    return <EmptyState message={d.noWeeks} hint={d.noWeeksHint} />
  }

  const selectedWeekId = weekIdParam ? Number(weekIdParam) : weeks[0]!.id
  const validWeekId    = weeks.find((w) => w.id === selectedWeekId)?.id ?? weeks[0]!.id

  const [{ summary, allKpis, insights }, recentImports] = await Promise.all([
    getDashboardData(validWeekId),
    getRecentImports(5),
  ])

  if (allKpis.length === 0) {
    return (
      <>
        <TopBar weeks={weeks} selectedWeekId={validWeekId} title={dict.nav.dashboard} />
        <EmptyState
          message={interpolate(d.noScores, { weekLabel: summary.weekLabel })}
          hint={d.noScoresHint}
        />
      </>
    )
  }

  return (
    <>
      <TopBar weeks={weeks} selectedWeekId={validWeekId} title={dict.nav.dashboard} />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">

          <section>
            <KpiCards
              summary={summary}
              totalRegisteredPlayers={allKpis.length}
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

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <InsightsPanel insights={insights} dict={dict.insights} />
            <ImportStatus imports={recentImports} dict={dict.imports} locale={locale} />
          </section>

          <section>
            <RankingTable kpis={allKpis} />
          </section>

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
        <div className="pt-2">
          <code className="text-xs bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded px-3 py-1.5 text-[var(--color-text-secondary)]">
            npm run db:seed
          </code>
        </div>
      </div>
    </main>
  )
}
