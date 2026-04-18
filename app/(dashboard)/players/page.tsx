import { Suspense } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { PlayersTable } from '@/features/players/components/PlayersTable'
import { ExportButton } from '@/components/ui/ExportButton'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { getLocale, getDict } from '@/lib/i18n/server'
import { getAllPlayers } from '@/server/services/playerService'
import { getSessionUser, hasPermission } from '@/server/security/authGuard'
import type { WeekApi } from '@/types/api'
export const maxDuration = 60

async function PlayersContent({ canManage }: { canManage: boolean }) {
  const allPlayers = await getAllPlayers(false)

  const exportRows = allPlayers.map((p) => ({
    'Nom':               p.name,
    'Alias':             p.alias ?? '',
    'Rang actuel':       p.currentRank ?? '',
    'Rang suggéré':      p.suggestedRank ?? '',
    'Niveau général':    p.generalLevel ?? '',
    'Profession':        p.professionKey ?? '',
    'Niveau profession': p.professionLevel ?? '',
    'Actif':             p.isActive ? 'Oui' : 'Non',
    'Rejoint le':        p.joinedAt ?? '',
    'Parti le':          p.leftAt ?? '',
  }))

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-6">
        <div className="flex justify-end">
          <ExportButton rows={exportRows} filename="joueurs" sheetName="Joueurs" />
        </div>
        <PlayersTable players={allPlayers} canManage={canManage} />
      </div>
    </main>
  )
}

function PlayersContentSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-6">
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} lines={1} />)}
        </div>
        <SkeletonCard lines={14} />
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
        <PlayersContent canManage={canManage} />
      </Suspense>
    </>
  )
}
