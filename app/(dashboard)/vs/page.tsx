import { Suspense } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { KpiCards } from '@/features/dashboard/components/KpiCards'
import { TopFlopPanel } from '@/features/dashboard/components/TopFlopPanel'
import { ScoreHeatmap } from '@/features/dashboard/components/ScoreHeatmap'
import { MobileScoreSummary } from '@/features/vs/components/MobileScoreSummary'
import { InsightsPanel } from '@/features/dashboard/components/InsightsPanel'
import { EcoDayBar } from '@/features/vs/components/EcoDayBar'
import { ExportButton } from '@/components/ui/ExportButton'
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton'
import { getDashboardData } from '@/server/services/kpiService'
import { isSnapshotStale } from '@/server/repositories/analyticsRepository'
import { getVsDaysForWeek } from '@/server/services/vsDayService'
import { getAllWeeks } from '@/server/services/weekService'
import { getAllPlayers } from '@/server/services/playerService'
import { getSessionUser, hasPermission } from '@/server/security/authGuard'
import { getLocale, getDict } from '@/lib/i18n/server'
import { perf } from '@/lib/perf'
import type { Dictionary } from '@/lib/i18n/types'
import type { WeekApi } from '@/types/api'

export const maxDuration = 60

interface PageProps {
  searchParams: Promise<{ weekId?: string }>
}

function getVsPageMessages(locale: 'fr' | 'en') {
  const isFrench = locale === 'fr'

  return {
    title: isFrench ? 'Scores VS' : 'VS scores',
    stale: {
      intro: isFrench
        ? 'Les scores viennent d etre importes ou modifies: les donnees sont en cours de recalcul.'
        : 'Scores were just imported or updated: data is still being recalculated.',
      hint: isFrench
        ? 'Rechargez la page dans quelques secondes'
        : 'Refresh the page in a few seconds',
      suffix: isFrench
        ? 'pour voir les resultats a jour.'
        : 'to see the updated results.',
    },
    export: {
      sheetName: isFrench ? 'Scores VS' : 'VS scores',
      columns: {
        rank: isFrench ? 'Rang' : 'Rank',
        player: isFrench ? 'Joueur' : 'Player',
        alias: isFrench ? 'Alias' : 'Alias',
        totalScore: isFrench ? 'Score total' : 'Total score',
        rawScore: isFrench ? 'Score brut' : 'Raw score',
        daysPlayed: isFrench ? 'Jours joues' : 'Days played',
        participation: isFrench ? 'Participation %' : 'Participation %',
        dailyAverage: isFrench ? 'Moyenne/jour' : 'Average/day',
        ecoDays: isFrench ? 'Jours eco' : 'Eco days',
        day: isFrench ? 'Jour' : 'Day',
      },
    },
    lockedWeekReason: isFrench
      ? 'Semaine verrouillee: les saisies manuelles sont bloquees.'
      : 'Locked week: manual edits are disabled.',
  }
}

async function VsContent({
  weekId,
  currentWeek,
  dict,
  locale,
  canEdit,
  canEco,
  manualEditDisabledReason,
}: {
  weekId: number
  currentWeek: WeekApi
  dict: Dictionary
  locale: 'fr' | 'en'
  canEdit: boolean
  canEco: boolean
  manualEditDisabledReason: string | null
}) {
  const done = perf('VsContent')
  const pageMessages = getVsPageMessages(locale)

  const [players, dashboardData, vsDays, snapshotStale] = await Promise.all([
    getAllPlayers(true),
    getDashboardData(weekId),
    getVsDaysForWeek(weekId),
    isSnapshotStale(weekId),
  ])
  done()

  const { summary, allKpis, insights } = dashboardData

  if (allKpis.length === 0) {
    return (
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
          <EcoDayBar
            weekId={weekId}
            vsDays={vsDays}
            canEdit={canEco}
            disabledReason={manualEditDisabledReason ?? undefined}
          />
          {snapshotStale && <StaleDataBanner locale={locale} />}
        </div>
      </main>
    )
  }

  const exportRows = allKpis.map((kpi) => {
    const byDay = Object.fromEntries(
      kpi.dailyScores.map((dayScore) => [`${pageMessages.export.columns.day} ${dayScore.dayOfWeek}`, dayScore.score]),
    )

    return {
      [pageMessages.export.columns.rank]: kpi.rank,
      [pageMessages.export.columns.player]: kpi.playerName,
      [pageMessages.export.columns.alias]: kpi.playerAlias ?? '',
      [pageMessages.export.columns.totalScore]: kpi.totalScore,
      [pageMessages.export.columns.rawScore]: kpi.rawTotalScore,
      [pageMessages.export.columns.daysPlayed]: kpi.daysPlayed,
      [pageMessages.export.columns.participation]: Math.round(kpi.participationRate * 100),
      [pageMessages.export.columns.dailyAverage]: Math.round(kpi.dailyAverage),
      [pageMessages.export.columns.ecoDays]: kpi.ecoDays,
      ...byDay,
    }
  })

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6">
        {snapshotStale && <StaleDataBanner locale={locale} />}

        <div className="flex items-center justify-between gap-3">
          <EcoDayBar
            weekId={weekId}
            vsDays={vsDays}
            canEdit={canEco}
            disabledReason={manualEditDisabledReason ?? undefined}
          />
          <div className="hidden md:block shrink-0">
            <ExportButton rows={exportRows} filename={currentWeek.label} sheetName={pageMessages.export.sheetName} />
          </div>
        </div>

        <section aria-label="KPI semaine">
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

        {/* Desktop: full interactive heatmap */}
        <section className="hidden md:block">
          <ScoreHeatmap kpis={allKpis} dict={dict.heatmap} weekId={weekId} canEdit={canEdit} />
        </section>

        {/* Mobile: read-only score summary */}
        <section className="block md:hidden">
          <MobileScoreSummary kpis={allKpis} dict={dict.heatmap} locale={locale} />
        </section>

        {insights.length > 0 && (
          <section className="hidden md:block">
            <InsightsPanel insights={insights} dict={dict.insights} />
          </section>
        )}
      </div>
    </main>
  )
}

function StaleDataBanner({ locale }: { locale: 'fr' | 'en' }) {
  const messages = getVsPageMessages(locale).stale

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/8 text-sm text-[var(--color-warning)]">
      <span className="shrink-0 text-base">{'\u23F3'}</span>
      <span>
        {messages.intro}
        <strong className="ml-1">{messages.hint}</strong> {messages.suffix}
      </span>
    </div>
  )
}

function VsContentSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6">
        {/* EcoDayBar skeleton */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-11 w-24 rounded-lg" />)}
        </div>
        {/* KPI cards — 2 cols mobile, 4 desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => <SkeletonCard key={index} />)}
        </div>
        {/* Top/Flop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonCard lines={6} />
          <SkeletonCard lines={6} />
        </div>
        {/* Desktop: heatmap table skeleton */}
        <div className="hidden md:block rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-3">
          <Skeleton className="h-4 w-40" />
          <div className="space-y-2 pt-2">
            {Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-8 w-full rounded-lg" />)}
          </div>
        </div>
        {/* Mobile: score list skeleton */}
        <div className="block md:hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-2">
          <Skeleton className="h-4 w-28 mb-4" />
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 py-1">
              <Skeleton className="h-3 w-5 shrink-0" />
              <Skeleton className="h-3 flex-1" />
              <Skeleton className="h-3 w-12 shrink-0" />
              <Skeleton className="h-3 w-8 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default async function VsPage({ searchParams }: PageProps) {
  const { weekId: weekIdParam } = await searchParams

  const [locale, weeks, user] = await Promise.all([
    getLocale(),
    getAllWeeks(),
    getSessionUser(),
  ])

  const canEdit = user ? hasPermission(user.role, 'scores:import') : false
  const canEco = user ? hasPermission(user.role, 'scores:edit') : false
  const pageMessages = getVsPageMessages(locale)

  if (weeks.length === 0) {
    const dict = await getDict(locale)
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3 max-w-sm px-6">
          <div className="text-5xl">{'\u{1F4ED}'}</div>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{dict.dashboard.noWeeks}</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">{dict.dashboard.noWeeksHint}</p>
        </div>
      </main>
    )
  }

  const selectedWeekId = weekIdParam ? Number(weekIdParam) : weeks[0]!.id
  const validWeekId = weeks.find((week) => week.id === selectedWeekId)?.id ?? weeks[0]!.id
  const currentWeek = weeks.find((week) => week.id === validWeekId)!
  const manualEditDisabledReason = currentWeek.isLocked ? pageMessages.lockedWeekReason : null
  const dict = await getDict(locale)

  return (
    <>
      <TopBar weeks={weeks} selectedWeekId={validWeekId} title={pageMessages.title} />
      <Suspense fallback={<VsContentSkeleton />}>
        <VsContent
          weekId={validWeekId}
          currentWeek={currentWeek}
          dict={dict}
          locale={locale}
          canEdit={canEdit && manualEditDisabledReason === null}
          canEco={canEco && manualEditDisabledReason === null}
          manualEditDisabledReason={manualEditDisabledReason}
        />
      </Suspense>
    </>
  )
}
