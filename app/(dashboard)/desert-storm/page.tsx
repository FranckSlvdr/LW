import { TopBar } from '@/components/layout/TopBar'
import { DesertStormTable } from '@/features/desert-storm/components/DesertStormTable'
import { DesertStormForm } from '@/features/desert-storm/components/DesertStormForm'
import { getDsScoresForWeek } from '@/server/services/desertStormService'
import { getTrainSettings } from '@/server/services/trainService'
import { getAllWeeks } from '@/server/services/weekService'
import { getAllPlayers } from '@/server/services/playerService'
import { getSessionUser, hasPermission } from '@/server/security/authGuard'
import { getLocale, getDict } from '@/lib/i18n/server'

interface PageProps {
  searchParams: Promise<{ weekId?: string }>
}

export default async function DesertStormPage({ searchParams }: PageProps) {
  const { weekId: weekIdParam } = await searchParams
  const locale = await getLocale()
  const dict   = await getDict(locale)
  const t      = dict.desertStorm
  const [weeks, players, trainSettings, user] = await Promise.all([
    getAllWeeks(),
    getAllPlayers(true),
    getTrainSettings(),
    getSessionUser(),
  ])
  const canEdit = user ? hasPermission(user.role, 'scores:edit') : false

  const selectedWeekId = weekIdParam ? Number(weekIdParam) : weeks[0]?.id ?? 0
  const validWeekId    = weeks.find((w) => w.id === selectedWeekId)?.id ?? weeks[0]?.id ?? 0

  const scores = validWeekId ? await getDsScoresForWeek(validWeekId) : []
  const missing = Math.max(0, players.length - scores.length)

  return (
    <>
      <TopBar weeks={weeks} selectedWeekId={validWeekId} title={t.pageTitle} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-6">

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 stagger">
            <StatPill label={t.statRecorded} value={String(scores.length)} />
            <StatPill label={t.statMissing}  value={String(missing)} />
            <StatPill label={t.statBest}     value={scores[0] ? scores[0].score.toLocaleString() : '—'} />
          </div>

          {/* Add/edit score form */}
          {canEdit && <DesertStormForm weekId={validWeekId} players={players} existingScores={scores} />}

          {/* Ranking table */}
          <DesertStormTable scores={scores} includeDsTop2={trainSettings.includeDsTop2} />

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
