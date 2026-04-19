import { Suspense } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { PlayersTable } from '@/features/players/components/PlayersTable'
import { PlayerCardList } from '@/features/players/components/PlayerCardList'
import { ExportButton } from '@/components/ui/ExportButton'
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton'
import { getLocale, getDict } from '@/lib/i18n/server'
import { getPlayersMessages } from '@/features/players/messages'
import { getAllPlayers } from '@/server/services/playerService'
import { getSessionUser, hasPermission } from '@/server/security/authGuard'
import type { WeekApi } from '@/types/api'

export const maxDuration = 60

async function PlayersContent({
  canManage,
  locale,
}: {
  canManage: boolean
  locale: 'fr' | 'en'
}) {
  const allPlayers = await getAllPlayers(false)
  const t = getPlayersMessages(locale)

  const exportRows = allPlayers.map((player) => ({
    [t.columns.player]: player.name,
    Alias: player.alias ?? '',
    [t.columns.currentRank]: player.currentRank ?? '',
    [t.columns.suggestedRank]: player.suggestedRank ?? '',
    [t.columns.generalLevel]: player.generalLevel ?? '',
    [t.columns.profession]: player.professionKey ?? '',
    ProfessionLevel: player.professionLevel ?? '',
    [t.columns.status]: player.isActive ? t.status.active : t.status.inactive,
    [t.addForm.joinedAt]: player.joinedAt ?? '',
    [locale === 'fr' ? 'Parti le' : 'Left on']: player.leftAt ?? '',
  }))

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6">
        {/* Export button — desktop only */}
        <div className="hidden md:flex justify-end">
          <ExportButton
            rows={exportRows}
            filename={locale === 'fr' ? 'joueurs' : 'players'}
            sheetName={locale === 'fr' ? 'Joueurs' : 'Players'}
          />
        </div>

        {/* Desktop: full table with inline editing */}
        <div className="hidden md:block">
          <PlayersTable players={allPlayers} canManage={canManage} />
        </div>

        {/* Mobile: card list with search + status filter */}
        <div className="block md:hidden">
          <PlayerCardList players={allPlayers} />
        </div>
      </div>
    </main>
  )
}

function PlayersContentSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6">
        {/* Desktop: table skeleton */}
        <div className="hidden md:block">
          <SkeletonCard lines={14} />
        </div>
        {/* Mobile: card list skeleton */}
        <div className="block md:hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] last:border-b-0">
              <Skeleton className="h-5 w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5 min-w-0">
                <Skeleton className="h-3 w-36" />
                <Skeleton className="h-2.5 w-24" />
              </div>
              <Skeleton className="h-3 w-10 shrink-0" />
              <Skeleton className="h-2 w-2 rounded-full shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default async function PlayersPage() {
  const [locale, user] = await Promise.all([
    getLocale(),
    getSessionUser(),
  ])

  const canManage = user ? hasPermission(user.role, 'players:manage') : false
  const dict = await getDict(locale)

  return (
    <>
      <TopBar weeks={[] as WeekApi[]} selectedWeekId={0} title={dict.nav.players} showWeekSelector={false} />
      <Suspense fallback={<PlayersContentSkeleton />}>
        <PlayersContent canManage={canManage} locale={locale} />
      </Suspense>
    </>
  )
}
