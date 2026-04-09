import { TopBar } from '@/components/layout/TopBar'
import { RatingResultTable } from '@/features/ranking/components/RatingResultTable'
import { TriggerRatingButton } from '@/features/ranking/components/TriggerRatingButton'
import { getActiveRatingForWeek, triggerRatingRun } from '@/server/services/ratingService'
import { getAllWeeks } from '@/server/services/weekService'
import { findAllPlayers } from '@/server/repositories/playerRepository'
import { getSessionUser, hasPermission } from '@/server/security/authGuard'
import { getLocale, getDict } from '@/lib/i18n/server'

interface RankingPageProps {
  searchParams: Promise<{ weekId?: string }>
}

export default async function RankingPage({ searchParams }: RankingPageProps) {
  const { weekId: weekIdParam } = await searchParams
  const [locale, weeks, players, user] = await Promise.all([
    getLocale(),
    getAllWeeks(),
    findAllPlayers(),
    getSessionUser(),
  ])
  const canRecalculate = user ? hasPermission(user.role, 'rating:recalculate') : false
  const dict = await getDict(locale)

  const selectedWeekId = weekIdParam ? Number(weekIdParam) : weeks[0]?.id ?? 0
  const validWeekId    = weeks.find((w) => w.id === selectedWeekId)?.id ?? weeks[0]?.id ?? 0
  const weekLabel      = weeks.find((w) => w.id === validWeekId)?.label ?? ''

  const ratings = validWeekId ? await getActiveRatingForWeek(validWeekId) : null
  const playerMap = new Map(players.map((p) => [p.id, { name: p.name, alias: p.alias }]))

  return (
    <>
      <TopBar weeks={weeks} selectedWeekId={validWeekId} title={dict.nav.ranking} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">

          {!ratings || ratings.length === 0 ? (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-center space-y-4">
              <div className="text-4xl">🏆</div>
              <p className="text-lg font-semibold text-[var(--color-text-primary)]">
                Aucun classement calculé pour {weekLabel || 'cette semaine'}
              </p>
              <p className="text-sm text-[var(--color-text-muted)]">
                Lancez un calcul de notation pour générer le classement.
              </p>
              {canRecalculate && validWeekId > 0 && (
                <TriggerRatingButton weekId={validWeekId} />
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--color-text-muted)]">
                  {ratings.length} joueurs classés · {weekLabel}
                </p>
                {canRecalculate && validWeekId > 0 && <TriggerRatingButton weekId={validWeekId} />}
              </div>
              <RatingResultTable ratings={ratings} playerMap={playerMap} />
            </>
          )}

        </div>
      </main>
    </>
  )
}
