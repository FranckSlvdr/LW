import { Suspense } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { KpiCards } from '@/features/dashboard/components/KpiCards'
import { TopFlopPanel } from '@/features/dashboard/components/TopFlopPanel'
import { InsightsPanel } from '@/features/dashboard/components/InsightsPanel'
import { LevelDistributionPanel } from '@/features/dashboard/components/LevelDistributionPanel'
import type { LevelBucket } from '@/features/dashboard/components/LevelDistributionPanel'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { ExportButton } from '@/components/ui/ExportButton'
import { getDashboardData } from '@/server/services/kpiService'
import { getAllWeeks } from '@/server/services/weekService'
import { getLocale, getDict } from '@/lib/i18n/server'
import { interpolate } from '@/lib/i18n/utils'
import type { Dictionary } from '@/lib/i18n/types'

export const maxDuration = 60

interface DashboardPageProps {
  searchParams: Promise<{ weekId?: string }>
}

function getDashboardPageMessages(locale: 'fr' | 'en') {
  const isFrench = locale === 'fr'

  return {
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
  }
}

async function DashboardContent({
  weekId,
  dict,
  locale,
}: {
  weekId: number
  dict: Dictionary
  locale: 'fr' | 'en'
}) {
  const d = dict.dashboard
  const pageMessages = getDashboardPageMessages(locale)

  const { summary, allKpis, insights, levelBuckets: snapshotBuckets } = await getDashboardData(weekId)
  const levelBuckets: LevelBucket[] = snapshotBuckets

  if (allKpis.length === 0) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <EmptyContent
          message={interpolate(d.noScores, { weekLabel: summary.weekLabel })}
          hint={d.noScoresHint}
        />
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
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6">
        {/* Export button — desktop only */}
        <div className="hidden md:flex justify-end">
          <ExportButton rows={exportRows} filename={summary.weekLabel} sheetName={pageMessages.export.sheetName} />
        </div>

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

        {/* Insights + level distribution — desktop: side by side, mobile: stacked */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <InsightsPanel insights={insights} dict={dict.insights} />
          <LevelDistributionPanel buckets={levelBuckets} />
        </section>
      </div>
    </main>
  )
}

function DashboardContentSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => <SkeletonCard key={index} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonCard lines={6} />
          <SkeletonCard lines={6} />
        </div>
      </div>
    </div>
  )
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { weekId: weekIdParam } = await searchParams

  const [locale, weeks] = await Promise.all([
    getLocale(),
    getAllWeeks(),
  ])

  const dict = await getDict(locale)
  const d = dict.dashboard

  if (weeks.length === 0) {
    return <EmptyState message={d.noWeeks} hint={d.noWeeksHint} />
  }

  const selectedWeekId = weekIdParam ? Number(weekIdParam) : weeks[0]!.id
  const validWeekId = weeks.find((week) => week.id === selectedWeekId)?.id ?? weeks[0]!.id

  return (
    <>
      <TopBar weeks={weeks} selectedWeekId={validWeekId} title={dict.nav.dashboard} />
      <Suspense fallback={<DashboardContentSkeleton />}>
        <DashboardContent weekId={validWeekId} dict={dict} locale={locale} />
      </Suspense>
    </>
  )
}

function EmptyState({ message, hint }: { message: string; hint: string }) {
  return (
    <main className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-3 max-w-sm px-6">
        <div className="text-5xl">{'\u{1F4ED}'}</div>
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

function EmptyContent({ message, hint }: { message: string; hint: string }) {
  return (
    <div className="text-center space-y-3 max-w-sm px-6">
      <div className="text-5xl">{'\u{1F4ED}'}</div>
      <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{message}</h2>
      <p className="text-sm text-[var(--color-text-secondary)]">{hint}</p>
    </div>
  )
}
