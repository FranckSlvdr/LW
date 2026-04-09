import { TopBar } from '@/components/layout/TopBar'
import { PlayersTable } from '@/features/players/components/PlayersTable'
import { getAllPlayers } from '@/server/services/playerService'
import { getSessionUser, hasPermission } from '@/server/security/authGuard'
import { getLocale, getDict } from '@/lib/i18n/server'
import { perf } from '@/lib/perf'
import { PLAYER_RANKS } from '@/types/domain'
import type { WeekApi } from '@/types/api'

export default async function PlayersPage() {
  const done = perf('PlayersPage')
  // getAllWeeks removed — TopBar has showWeekSelector=false, weeks are never rendered
  const [locale, allPlayers, user] = await Promise.all([
    getLocale(),
    getAllPlayers(false),
    getSessionUser(),
  ])

  const canManage = user ? hasPermission(user.role, 'players:manage') : false

  const dict           = await getDict(locale)
  const activePlayers  = allPlayers.filter((p) => p.isActive)
  const inactive       = allPlayers.length - activePlayers.length
  const unclassified   = activePlayers.filter((p) => !p.currentRank).length

  // Count actives per rank
  const rankCounts = PLAYER_RANKS.reduce<Record<string, number>>((acc, r) => {
    acc[r] = activePlayers.filter((p) => p.currentRank === r).length
    return acc
  }, {})

  done()
  return (
    <>
      <TopBar weeks={[] as WeekApi[]} selectedWeekId={0} title={dict.nav.players} showWeekSelector={false} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-6">

          {/* Stats strip */}
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <StatPill label="Actifs"    value={String(activePlayers.length)} />
            <StatPill label="Inactifs"  value={String(inactive)} dim />
            {PLAYER_RANKS.slice().reverse().map((r) => (
              <StatPill key={r} label={r} value={String(rankCounts[r] ?? 0)} />
            ))}
            {unclassified > 0 && (
              <StatPill label="Non classés" value={String(unclassified)} dim />
            )}
          </div>

          <PlayersTable players={allPlayers} canManage={canManage} />
        </div>
      </main>
    </>
  )
}

function StatPill({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 card-shadow">
      <p className={`label-sm mb-1 ${dim ? 'text-[var(--color-text-muted)]' : ''}`}>{label}</p>
      <p className={`text-xl font-bold ${dim ? 'text-[var(--color-text-secondary)]' : 'text-[var(--color-text-primary)]'}`}>
        {value}
      </p>
    </div>
  )
}
