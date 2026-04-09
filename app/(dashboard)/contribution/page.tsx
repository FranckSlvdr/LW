import { TopBar } from '@/components/layout/TopBar'
import { ContributionTable } from '@/features/contribution/components/ContributionTable'
import { ContributionForm } from '@/features/contribution/components/ContributionForm'
import { getContributionsForWeek } from '@/server/services/contributionService'
import { getAllWeeks } from '@/server/services/weekService'
import { getAllPlayers } from '@/server/services/playerService'
import { getSessionUser, hasPermission } from '@/server/security/authGuard'
import { formatScore } from '@/lib/utils'
import { getLocale, getDict } from '@/lib/i18n/server'

interface PageProps {
  searchParams: Promise<{ weekId?: string }>
}

export default async function ContributionPage({ searchParams }: PageProps) {
  const { weekId: weekIdParam } = await searchParams
  const locale = await getLocale()
  const dict   = await getDict(locale)
  const t      = dict.contribution
  const [weeks, players, user] = await Promise.all([getAllWeeks(), getAllPlayers(true), getSessionUser()])
  const canEdit = user ? hasPermission(user.role, 'scores:edit') : false

  const selectedWeekId = weekIdParam ? Number(weekIdParam) : weeks[0]?.id ?? 0
  const validWeekId    = weeks.find((w) => w.id === selectedWeekId)?.id ?? weeks[0]?.id ?? 0

  const contributions = validWeekId ? await getContributionsForWeek(validWeekId) : []

  const totalAmount = contributions.reduce((s, c) => s + c.amount, 0)
  const avgAmount   = contributions.length > 0 ? Math.round(totalAmount / contributions.length) : 0

  return (
    <>
      <TopBar weeks={weeks} selectedWeekId={validWeekId} title={t.pageTitle} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-6">

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 stagger">
            <StatPill label={t.statEntered} value={String(contributions.length)} />
            <StatPill label={t.statTotal}   value={formatScore(totalAmount)} />
            <StatPill label={t.statAvg}     value={formatScore(avgAmount)} />
          </div>

          {canEdit && <ContributionForm weekId={validWeekId} players={players} existing={contributions} />}
          <ContributionTable contributions={contributions} />

        </div>
      </main>
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
