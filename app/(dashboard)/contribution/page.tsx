import { Suspense } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { ContributionTable } from '@/features/contribution/components/ContributionTable'
import { ContributionForm } from '@/features/contribution/components/ContributionForm'
import { ExportButton } from '@/components/ui/ExportButton'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { getContributionsForWeek } from '@/server/services/contributionService'
import { getAllWeeks } from '@/server/services/weekService'
import { getAllPlayers } from '@/server/services/playerService'
import { getSessionUser, hasPermission } from '@/server/security/authGuard'
import { formatScore } from '@/lib/utils'
import { getLocale, getDict } from '@/lib/i18n/server'
import type { Dictionary } from '@/lib/i18n/types'
import { getContributionMessages } from '@/features/contribution/messages'
export const maxDuration = 60

interface PageProps {
  searchParams: Promise<{ weekId?: string }>
}

async function ContributionContent({
  weekId,
  canEdit,
  manualEditDisabledReason,
  dict,
  locale,
}: {
  weekId: number
  canEdit: boolean
  manualEditDisabledReason: string | null
  dict: Dictionary
  locale: 'fr' | 'en'
}) {
  const t = dict.contribution
  const isFrench = locale === 'fr'
  const [players, contributions] = await Promise.all([
    getAllPlayers(true),
    weekId ? getContributionsForWeek(weekId) : Promise.resolve([]),
  ])

  const totalAmount = contributions.reduce((s, c) => s + c.amount, 0)
  const avgAmount   = contributions.length > 0 ? Math.round(totalAmount / contributions.length) : 0

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-6">

        <div className="flex items-start justify-between gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 stagger flex-1">
            <StatPill label={t.statEntered} value={String(contributions.length)} />
            <StatPill label={t.statTotal}   value={formatScore(totalAmount)} />
            <StatPill label={t.statAvg}     value={formatScore(avgAmount)} />
          </div>
          <ExportButton
            rows={contributions.map((c) => ({
              [isFrench ? 'Rang' : 'Rank']: c.rank,
              [isFrench ? 'Joueur' : 'Player']: c.playerName,
              Alias: c.playerAlias ?? '',
              [isFrench ? 'Montant' : 'Amount']: c.amount,
              [isFrench ? 'Note' : 'Note']: c.note ?? '',
            }))}
            filename={`contributions-semaine-${weekId}`}
            sheetName={isFrench ? 'Contributions' : 'Contributions'}
          />
        </div>

        {canEdit && (
          <ContributionForm
            weekId={weekId}
            players={players}
            existing={contributions}
            disabled={manualEditDisabledReason !== null}
            disabledReason={manualEditDisabledReason ?? undefined}
          />
        )}
        <ContributionTable contributions={contributions} />

      </div>
    </main>
  )
}

function ContributionSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <SkeletonCard lines={1} />
          <SkeletonCard lines={1} />
          <SkeletonCard lines={1} />
        </div>
        <SkeletonCard lines={12} />
      </div>
    </div>
  )
}

export default async function ContributionPage({ searchParams }: PageProps) {
  const { weekId: weekIdParam } = await searchParams
  const [locale, weeks, user] = await Promise.all([
    getLocale(),
    getAllWeeks(),
    getSessionUser(),
  ])
  const dict    = await getDict(locale)
  const messages = getContributionMessages(locale)
  const canEdit = user ? hasPermission(user.role, 'scores:edit') : false

  const selectedWeekId = weekIdParam ? Number(weekIdParam) : weeks[0]?.id ?? 0
  const validWeekId    = weeks.find((w) => w.id === selectedWeekId)?.id ?? weeks[0]?.id ?? 0
  const currentWeek    = weeks.find((w) => w.id === validWeekId)
  const isLatestWeek   = currentWeek ? weeks[0]?.id === currentWeek.id : false
  const manualEditDisabledReason = currentWeek?.isLocked
    ? messages.lockedWeek
    : !isLatestWeek
    ? messages.activeWeekOnly
    : null

  return (
    <>
      <TopBar weeks={weeks} selectedWeekId={validWeekId} title={dict.contribution.pageTitle} />
      <Suspense fallback={<ContributionSkeleton />}>
        <ContributionContent
          weekId={validWeekId}
          canEdit={canEdit}
          manualEditDisabledReason={manualEditDisabledReason}
          dict={dict}
          locale={locale}
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
