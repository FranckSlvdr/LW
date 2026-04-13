import { Suspense } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { KpiCards } from '@/features/dashboard/components/KpiCards'
import { TopFlopPanel } from '@/features/dashboard/components/TopFlopPanel'
import { ScoreHeatmap } from '@/features/dashboard/components/ScoreHeatmap'
import { InsightsPanel } from '@/features/dashboard/components/InsightsPanel'
import { DailyScoresForm } from '@/features/vs/components/DailyScoresForm'
import { EcoDayBar } from '@/features/vs/components/EcoDayBar'
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton'
import { getDashboardData } from '@/server/services/kpiService'
import { getVsDaysForWeek } from '@/server/services/vsDayService'
import { getAllWeeks } from '@/server/services/weekService'
import { getAllPlayers } from '@/server/services/playerService'
import { getSessionUser, hasPermission } from '@/server/security/authGuard'
import { getLocale, getDict } from '@/lib/i18n/server'
import { interpolate } from '@/lib/i18n/utils'
import { perf } from '@/lib/perf'
import type { Dictionary } from '@/lib/i18n/types'
import type { WeekApi } from '@/types/api'

interface PageProps {
  searchParams: Promise<{ weekId?: string }>
}

// ─── Heavy content (streams in after shell) ───────────────────────────────────

async function VsContent({
  weekId,
  currentWeek,
  dict,
  locale,
  canEdit,
  canEco,
}: {
  weekId: number
  currentWeek: WeekApi
  dict: Dictionary
  locale: string
  canEdit: boolean
  canEco: boolean
}) {
  const done = perf('VsContent')

  const [players, dashboardData, vsDays] = await Promise.all([
    getAllPlayers(true),
    getDashboardData(weekId),
    getVsDaysForWeek(weekId),
  ])
  done()

  const d = dict.dashboard
  const { summary, allKpis, insights } = dashboardData

  const existingScores = allKpis.flatMap((kpi) =>
    kpi.dailyScores
      .filter((ds) => ds.score > 0)
      .map((ds) => ({
        playerId:  kpi.playerId,
        dayOfWeek: ds.dayOfWeek as number,
        score:     ds.score,
      })),
  )

  if (allKpis.length === 0) {
    return (
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
          <EcoDayBar weekId={weekId} vsDays={vsDays} canEdit={canEco} />
          {canEdit && (
            <DailyScoresForm
              weekId={weekId}
              weekLabel={currentWeek.label}
              players={players}
              existingScores={existingScores}
              ecoDays={vsDays}
            />
          )}
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">

        <EcoDayBar weekId={weekId} vsDays={vsDays} canEdit={canEco} />

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
              weekId={weekId}
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
  )
}

// ─── Content-only skeleton ────────────────────────────────────────────────────

function VsContentSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex gap-3">
          {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-9 w-16 rounded-lg" />)}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonCard lines={6} />
          <SkeletonCard lines={6} />
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-3">
          <Skeleton className="h-4 w-40" />
          <div className="space-y-2 pt-2">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-8 w-full rounded-lg" />)}
          </div>
        </div>
        <SkeletonCard lines={8} />
      </div>
    </div>
  )
}

// ─── Page shell (resolves fast via cached weeks) ──────────────────────────────

export default async function VsPage({ searchParams }: PageProps) {
  const { weekId: weekIdParam } = await searchParams

  // Fast: weeks (cached), locale, user — all independent
  const [locale, weeks, user] = await Promise.all([
    getLocale(),
    getAllWeeks(),
    getSessionUser(),
  ])

  const canEdit = user ? hasPermission(user.role, 'scores:import') : false
  const canEco  = user ? hasPermission(user.role, 'scores:edit')   : false

  if (weeks.length === 0) {
    const dict = await getDict(locale)
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3 max-w-sm px-6">
          <div className="text-5xl">📭</div>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{dict.dashboard.noWeeks}</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">{dict.dashboard.noWeeksHint}</p>
        </div>
      </main>
    )
  }

  const selectedWeekId = weekIdParam ? Number(weekIdParam) : weeks[0]!.id
  const validWeekId    = weeks.find((w) => w.id === selectedWeekId)?.id ?? weeks[0]!.id
  const currentWeek    = weeks.find((w) => w.id === validWeekId)!

  const dict = await getDict(locale)

  return (
    <>
      <TopBar weeks={weeks} selectedWeekId={validWeekId} title="Scores VS" />
      <Suspense fallback={<VsContentSkeleton />}>
        <VsContent
          weekId={validWeekId}
          currentWeek={currentWeek}
          dict={dict}
          locale={locale}
          canEdit={canEdit}
          canEco={canEco}
        />
      </Suspense>
    </>
  )
}
