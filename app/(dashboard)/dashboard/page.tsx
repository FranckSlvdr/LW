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

// ─── Heavy content (streams in after shell) ───────────────────────────────────

async function DashboardContent({
  weekId,
  dict,
}: {
  weekId: number
  dict: Dictionary
}) {
  const d = dict.dashboard

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
    const byDay = Object.fromEntries(kpi.dailyScores.map((ds) => [`Jour ${ds.dayOfWeek}`, ds.score]))
    return {
      'Rang':           kpi.rank,
      'Joueur':         kpi.playerName,
      'Alias':          kpi.playerAlias ?? '',
      'Score total':    kpi.totalScore,
      'Score brut':     kpi.rawTotalScore,
      'Jours joués':    kpi.daysPlayed,
      'Participation %': Math.round(kpi.participationRate * 100),
      'Moyenne/jour':   Math.round(kpi.dailyAverage),
      'Jours éco':      kpi.ecoDays,
      ...byDay,
    }
  })

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-6">

        <div className="flex justify-end">
          <ExportButton rows={exportRows} filename={summary.weekLabel} sheetName="Scores VS" />
        </div>

        <section>
          <KpiCards
            summary={summary}
            totalRegisteredPlayers={allKpis.length}
            dict={dict.kpi}
          />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <InsightsPanel insights={insights} dict={dict.insights} />
          <LevelDistributionPanel buckets={levelBuckets} />
        </section>

        <section>
          <TopFlopPanel
            topPlayers={summary.topPlayers}
            flopPlayers={summary.flopPlayers}
            dict={dict.topFlop}
          />
        </section>

      </div>
    </main>
  )
}

// ─── Content-only skeleton (shown while DashboardContent streams) ─────────────

function DashboardContentSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
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

// ─── Page shell (resolves fast via cached weeks) ──────────────────────────────

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

  return (
    <>
      <TopBar weeks={weeks} selectedWeekId={validWeekId} title={dict.nav.dashboard} />
      <Suspense fallback={<DashboardContentSkeleton />}>
        <DashboardContent
          weekId={validWeekId}
          dict={dict}
        />
      </Suspense>
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

function EmptyContent({ message, hint }: { message: string; hint: string }) {
  return (
    <div className="text-center space-y-3 max-w-sm px-6">
      <div className="text-5xl">📭</div>
      <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{message}</h2>
      <p className="text-sm text-[var(--color-text-secondary)]">{hint}</p>
    </div>
  )
}
