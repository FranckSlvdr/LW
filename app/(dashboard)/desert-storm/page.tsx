import { Suspense } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { DesertStormTable } from '@/features/desert-storm/components/DesertStormTable'
import { DesertStormForm } from '@/features/desert-storm/components/DesertStormForm'
import { ExportButton } from '@/components/ui/ExportButton'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { getDsScoresForWeek } from '@/server/services/desertStormService'
import { getTrainSettings } from '@/server/services/trainService'
import { getAllWeeks } from '@/server/services/weekService'
import { getAllPlayers } from '@/server/services/playerService'
import { getSessionUser, hasPermission } from '@/server/security/authGuard'
import { getLocale, getDict } from '@/lib/i18n/server'
import type { Dictionary } from '@/lib/i18n/types'

interface PageProps {
  searchParams: Promise<{ weekId?: string }>
}

async function DesertStormContent({
  weekId,
  canEdit,
  manualEditDisabledReason,
  dict,
}: {
  weekId: number
  canEdit: boolean
  manualEditDisabledReason: string | null
  dict: Dictionary
}) {
  const t = dict.desertStorm
  const [players, scores, trainSettings] = await Promise.all([
    getAllPlayers(true),
    weekId ? getDsScoresForWeek(weekId) : Promise.resolve([]),
    getTrainSettings(),
  ])
  const missing = Math.max(0, players.length - scores.length)

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-6">

        <div className="flex items-start justify-between gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 stagger flex-1">
            <StatPill label={t.statRecorded} value={String(scores.length)} />
            <StatPill label={t.statMissing}  value={String(missing)} />
            <StatPill label={t.statBest}     value={scores[0] ? scores[0].score.toLocaleString() : '—'} />
          </div>
          <ExportButton
            rows={scores.map((s) => ({
              'Rang':   s.rank,
              'Joueur': s.playerName,
              'Alias':  s.playerAlias ?? '',
              'Score':  s.score,
            }))}
            filename={`desert-storm-semaine-${weekId}`}
            sheetName="Desert Storm"
          />
        </div>

        {canEdit && (
          <DesertStormForm
            weekId={weekId}
            players={players}
            existingScores={scores}
            disabled={manualEditDisabledReason !== null}
            disabledReason={manualEditDisabledReason ?? undefined}
          />
        )}
        <DesertStormTable scores={scores} includeDsTop2={trainSettings.includeDsTop2} />

      </div>
    </main>
  )
}

function DesertStormSkeleton() {
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

export default async function DesertStormPage({ searchParams }: PageProps) {
  const { weekId: weekIdParam } = await searchParams
  const [locale, weeks, user] = await Promise.all([
    getLocale(),
    getAllWeeks(),
    getSessionUser(),
  ])
  const dict    = await getDict(locale)
  const canEdit = user ? hasPermission(user.role, 'scores:edit') : false

  const selectedWeekId = weekIdParam ? Number(weekIdParam) : weeks[0]?.id ?? 0
  const validWeekId    = weeks.find((w) => w.id === selectedWeekId)?.id ?? weeks[0]?.id ?? 0
  const currentWeek    = weeks.find((w) => w.id === validWeekId)
  const isLatestWeek   = currentWeek ? weeks[0]?.id === currentWeek.id : false
  const manualEditDisabledReason = currentWeek?.isLocked
    ? 'Semaine verrouillee : les saisies manuelles sont bloquees.'
    : !isLatestWeek
    ? 'Les saisies manuelles sont autorisees uniquement sur la semaine active.'
    : null

  return (
    <>
      <TopBar weeks={weeks} selectedWeekId={validWeekId} title={dict.desertStorm.pageTitle} />
      <Suspense fallback={<DesertStormSkeleton />}>
        <DesertStormContent
          weekId={validWeekId}
          canEdit={canEdit}
          manualEditDisabledReason={manualEditDisabledReason}
          dict={dict}
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
