'use client'

import { useState, useMemo } from 'react'
import { useI18n } from '@/lib/i18n/client'
import { PlayerCard } from './PlayerCard'
import { getPlayersMessages } from '@/features/players/messages'
import { sortPlayers } from '@/features/players/lib/playerTableUtils'
import type { PlayerApi } from '@/types/api'

type StatusFilter = 'all' | 'active' | 'inactive'

interface Props {
  players: PlayerApi[]
}

export function PlayerCardList({ players }: Props) {
  const { locale } = useI18n()
  const t = getPlayersMessages(locale)
  const isFr = locale === 'fr'

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('active')

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return sortPlayers(players).filter((player) => {
      const statusOk =
        status === 'all' ||
        (status === 'active' ? player.isActive : !player.isActive)
      const searchOk =
        !q ||
        player.name.toLowerCase().includes(q) ||
        (player.alias?.toLowerCase().includes(q) ?? false)
      return statusOk && searchOk
    })
  }, [players, search, status])

  const statusFilters: { key: StatusFilter; label: string }[] = [
    { key: 'active',   label: t.statusFilters.active },
    { key: 'all',      label: t.statusFilters.all },
    { key: 'inactive', label: t.statusFilters.inactive },
  ]

  return (
    <div className="space-y-3">
      {/* Search + status filter */}
      <div className="flex items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isFr ? 'Rechercher un joueur…' : 'Search a player…'}
          className="flex-1 min-w-0 text-sm bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-lg px-3 py-2 focus:border-[var(--color-accent)] focus:outline-none transition-colors"
        />
        <div className="flex rounded-lg overflow-hidden border border-[var(--color-border)] shrink-0">
          {statusFilters.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatus(key)}
              className={[
                'px-3 py-2 text-xs font-medium transition-colors min-h-[44px]',
                status === key
                  ? 'bg-[var(--color-accent-dim)] text-[var(--color-accent)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] bg-[var(--color-surface)]',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Card list */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
        {filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
            {t.noPlayers}
          </p>
        ) : (
          filtered.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              statusLabel={t.status.active}
              inactiveLabel={t.status.inactive}
            />
          ))
        )}
      </div>

      {/* Count */}
      <p className="text-xs text-[var(--color-text-muted)] text-center">
        {filtered.length} {t.playersCount}{filtered.length !== 1 ? 's' : ''}
      </p>
    </div>
  )
}
