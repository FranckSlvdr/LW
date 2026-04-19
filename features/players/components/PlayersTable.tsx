'use client'

import { useState } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useI18n } from '@/lib/i18n/client'
import { getPlayersMessages } from '@/features/players/messages'
import {
  MAX_PROFESSION_LEVEL,
  PROFESSION_ICON,
  RANK_BADGE_VARIANT,
  summarizePlayers,
  sortPlayers,
} from '@/features/players/lib/playerTableUtils'
import type {
  FilterLevel,
  FilterRank,
  FilterStatus,
} from '@/features/players/lib/playerTableUtils'
import { PLAYER_RANKS } from '@/types/domain'
import type { PlayerApi, ProfessionApi } from '@/types/api'
import type { PlayerRank } from '@/types/domain'


const PROFESSION_KEYS = Object.keys(PROFESSION_ICON)
const EMPTY_MARK = '\u2014'
const CHECK_MARK = '\u2713'
const CROSS_MARK = '\u2715'
const ELLIPSIS = '\u2026'
const INFO_MARK = '\u24D8'
const UNKNOWN_PROFESSION_ICON = '\u2753'

interface PlayersTableProps {
  players: PlayerApi[]
  canManage: boolean
}

interface EditingName {
  id: number
  value: string
}

interface EditingLevel {
  id: number
  value: string
}

interface EditingJoinedAt {
  id: number
  value: string
}

interface EditingProfession {
  id: number
  key: string
  level: string
}

export function PlayersTable({ players, canManage }: PlayersTableProps) {
  const { locale } = useI18n()
  const t = getPlayersMessages(locale)
  const [rows, setRows] = useState(() => sortPlayers(players))
  const [showAdd, setShowAdd] = useState(false)
  const [filterStatus, setStatus] = useState<FilterStatus>('all')
  const [filterRank, setRank] = useState<FilterRank>('all')
  const [filterLevel, setLevel] = useState<FilterLevel>(null)
  const [confirmDelId, setConfirmDel] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [editingName, setEditingName] = useState<EditingName | null>(null)
  const [editingLevel, setEditingLevel] = useState<EditingLevel | null>(null)
  const [editingJoinedAt, setEditingJoinedAt] = useState<EditingJoinedAt | null>(null)
  const [editingProfession, setEditingProf] = useState<EditingProfession | null>(null)

  function replacePlayer(nextPlayer: PlayerApi) {
    setRows((current) =>
      sortPlayers(current.map((player) => (player.id === nextPlayer.id ? nextPlayer : player))),
    )
  }

  function updatePlayer(playerId: number, updater: (player: PlayerApi) => PlayerApi) {
    setRows((current) =>
      sortPlayers(current.map((player) => (player.id === playerId ? updater(player) : player))),
    )
  }

  function getPlayerById(playerId: number): PlayerApi | undefined {
    return rows.find((player) => player.id === playerId)
  }

  async function handlePatch(playerId: number, body: Record<string, unknown>) {
    setDeleteError(null)
    setIsSaving(true)

    try {
      const res = await fetch(`/api/players/${playerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setDeleteError((data as { error?: { message?: string } })?.error?.message ?? t.errors.update)
        return
      }

      const updated = (data as { data?: PlayerApi }).data
      if (updated) replacePlayer(updated)
    } catch {
      setDeleteError(t.errors.network)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleRankChange(playerId: number, rank: PlayerRank | null) {
    const previousPlayer = getPlayerById(playerId)
    if (!previousPlayer || previousPlayer.currentRank === rank) return

    updatePlayer(playerId, (player) => ({
      ...player,
      currentRank: rank,
    }))

    setDeleteError(null)
    setIsSaving(true)

    try {
      const res = await fetch(`/api/players/${playerId}/rank`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentRank: rank }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        updatePlayer(playerId, () => previousPlayer)
        setDeleteError((data as { error?: { message?: string } })?.error?.message ?? t.errors.updateRank)
        return
      }

      const updated = (data as { data?: PlayerApi }).data
      if (updated) replacePlayer(updated)
    } catch {
      updatePlayer(playerId, () => previousPlayer)
      setDeleteError(t.errors.network)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(playerId: number) {
    setDeleteError(null)
    setIsSaving(true)

    try {
      const res = await fetch(`/api/players/${playerId}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setDeleteError((data as { error?: { message?: string } })?.error?.message ?? t.errors.delete)
        return
      }

      const result = (data as { data?: { mode?: string; player?: PlayerApi } }).data
      if (result?.mode === 'deactivated' && result.player) {
        replacePlayer(result.player)
        setDeleteError(t.errors.fallbackDeactivate)
      } else {
        setRows((current) => current.filter((player) => player.id !== playerId))
      }

      setConfirmDel(null)
    } catch {
      setDeleteError(t.errors.network)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSaveName(playerId: number) {
    if (!editingName || editingName.id !== playerId) return

    const name = editingName.value.trim()
    setEditingName(null)
    if (!name) return

    const currentPlayer = rows.find((player) => player.id === playerId)
    if (name === currentPlayer?.name) return

    await handlePatch(playerId, { name })
  }

  async function handleSaveLevel(playerId: number) {
    if (!editingLevel || editingLevel.id !== playerId) return

    const raw = editingLevel.value.trim()
    setEditingLevel(null)
    const generalLevel = raw === '' ? null : Number(raw)
    if (generalLevel !== null && Number.isNaN(generalLevel)) return

    const currentPlayer = rows.find((player) => player.id === playerId)
    if (generalLevel === currentPlayer?.generalLevel) return

    await handlePatch(playerId, { generalLevel })
  }

  async function handleSaveJoinedAt(playerId: number) {
    if (!editingJoinedAt || editingJoinedAt.id !== playerId) return

    const raw = editingJoinedAt.value.trim()
    setEditingJoinedAt(null)

    const currentPlayer = rows.find((player) => player.id === playerId)
    if (raw === (currentPlayer?.joinedAt ?? '')) return

    await handlePatch(playerId, { joinedAt: raw === '' ? null : raw })
  }

  async function handleSaveProfession(playerId: number) {
    if (!editingProfession || editingProfession.id !== playerId) return

    const { key, level: rawLevel } = editingProfession
    setEditingProf(null)

    const level = Number(rawLevel)
    if (!key || Number.isNaN(level) || level < 1 || level > MAX_PROFESSION_LEVEL) return

    setDeleteError(null)
    setIsSaving(true)

    try {
      const res = await fetch('/api/professions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, professionKey: key, level }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setDeleteError((data as { error?: { message?: string } })?.error?.message ?? t.errors.updateProfession)
        return
      }

      const profession = (data as { data?: ProfessionApi }).data
      if (profession) {
        updatePlayer(playerId, (player) => ({
          ...player,
          professionKey: profession.professionKey,
          professionLevel: profession.level,
        }))
      }
    } catch {
      setDeleteError(t.errors.network)
    } finally {
      setIsSaving(false)
    }
  }

  function handlePlayerCreated(player: PlayerApi) {
    setRows((current) => sortPlayers([...current, player]))
    setShowAdd(false)
  }

  const {
    filtered,
    activeCount,
    inactiveCount,
    unclassifiedCount,
    rankCounts,
    sortedLevels,
    unfilledLevels,
  } = summarizePlayers(rows, filterStatus, filterRank, filterLevel)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <StatPill label={t.stats.active} value={String(activeCount)} />
        <StatPill label={t.stats.inactive} value={String(inactiveCount)} dim />
        {PLAYER_RANKS.slice().reverse().map((rank) => (
          <StatPill key={rank} label={rank} value={String(rankCounts[rank] ?? 0)} />
        ))}
        {unclassifiedCount > 0 && (
          <StatPill label={t.stats.unranked} value={String(unclassifiedCount)} dim />
        )}
      </div>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 card-shadow">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="label-sm">{t.levelDistributionTitle}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{t.levelDistributionSubtitle}</p>
          </div>
          {unfilledLevels > 0 && (
            <Badge variant="neutral">
              {unfilledLevels} {t.noLevelValue}
            </Badge>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {sortedLevels.length > 0 ? (
            sortedLevels.map(({ level, count }) => (
              <button
                key={level}
                onClick={() => setLevel(filterLevel === level ? null : level)}
                className={[
                  'inline-flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors cursor-pointer',
                  filterLevel === level
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-dim)] text-[var(--color-accent)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface-raised)] hover:border-[var(--color-accent)]/50',
                ].join(' ')}
              >
                <span className="text-sm font-semibold text-[var(--color-text-primary)]">{t.levelLabel} {level}</span>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {count} {t.playersCount}{count > 1 ? 's' : ''}
                </span>
              </button>
            ))
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">{t.noLevel}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {PLAYER_RANKS.slice().reverse().map((rank) => (
          <button
            key={rank}
            onClick={() => setRank(filterRank === rank ? 'all' : rank)}
            className={[
              'rounded-xl border px-3 py-2.5 text-center transition-colors cursor-pointer',
              filterRank === rank
                ? 'border-[var(--color-accent)] bg-[var(--color-accent-dim)]'
                : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-raised)]',
            ].join(' ')}
          >
            <p className="text-xs font-bold text-[var(--color-text-primary)]">{rankCounts[rank] ?? 0}</p>
            <p className="text-[0.6rem] text-[var(--color-text-muted)] mt-0.5">{rank}</p>
          </button>
        ))}
        <button
          onClick={() => setRank(filterRank === 'unclassified' ? 'all' : 'unclassified')}
          className={[
            'rounded-xl border px-3 py-2.5 text-center transition-colors cursor-pointer',
            filterRank === 'unclassified'
              ? 'border-[var(--color-accent)] bg-[var(--color-accent-dim)]'
              : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-raised)]',
          ].join(' ')}
        >
          <p className="text-xs font-bold text-[var(--color-text-primary)]">{unclassifiedCount}</p>
          <p className="text-[0.6rem] text-[var(--color-text-muted)] mt-0.5">{t.unranked}</p>
        </button>
      </div>

      <Card padding="none">
        <div className="p-5 pb-3">
          <CardHeader
            title={t.singlePlayer}
            subtitle={`${filtered.length} / ${rows.length} ${t.playersCount}${rows.length > 1 ? 's' : ''}`}
            action={(
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex rounded-lg border border-[var(--color-border)] overflow-hidden text-xs">
                  {(['all', 'active', 'inactive'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setStatus(filter)}
                      className={[
                        'px-3 py-1.5 transition-colors',
                        filterStatus === filter
                          ? 'bg-[var(--color-accent)] text-white'
                          : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)]',
                      ].join(' ')}
                    >
                      {t.statusFilters[filter]}
                    </button>
                  ))}
                </div>
                {canManage && (
                  <button
                    onClick={() => setShowAdd(true)}
                    className="px-3 py-1.5 text-xs bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors"
                  >
                    {t.addPlayer}
                  </button>
                )}
              </div>
            )}
          />
        </div>

        {canManage && showAdd && (
          <div className="mx-5 mb-4">
            <AddPlayerForm locale={locale} onCancel={() => setShowAdd(false)} onCreated={handlePlayerCreated} />
          </div>
        )}

        {deleteError && (
          <div className="mx-5 mb-3 px-4 py-2.5 rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 text-sm text-[var(--color-danger)] flex items-center justify-between gap-3">
            <span>{deleteError}</span>
            <button onClick={() => setDeleteError(null)} className="text-[var(--color-danger)] hover:opacity-70 shrink-0">{CROSS_MARK}</button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-[var(--color-border)] bg-[var(--color-surface-raised)]/40">
                <th className="px-5 py-3 text-left text-[var(--color-text-muted)] font-medium text-xs">{t.columns.player}</th>
                <th className="px-5 py-3 text-left text-[var(--color-text-muted)] font-medium text-xs">{t.columns.currentRank}</th>
                <th className="px-5 py-3 text-left text-[var(--color-text-muted)] font-medium text-xs">{t.columns.suggestedRank}</th>
                <th className="px-4 py-3 text-center text-[var(--color-text-muted)] font-medium text-xs">{t.columns.profession}</th>
                <th className="px-4 py-3 text-center text-[var(--color-text-muted)] font-medium text-xs">{t.columns.generalLevel}</th>
                <th className="px-4 py-3 text-center text-[var(--color-text-muted)] font-medium text-xs">{t.columns.joinedAt}</th>
                <th className="px-5 py-3 text-center text-[var(--color-text-muted)] font-medium text-xs">{t.columns.status}</th>
                {canManage && <th className="px-5 py-3 text-right text-[var(--color-text-muted)] font-medium text-xs">{t.columns.actions}</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((player) => (
                <tr
                  key={player.id}
                  className={[
                    'border-b border-[var(--color-border-subtle)] transition-colors hover:bg-[var(--color-surface-raised)]',
                    !player.isActive ? 'opacity-50' : '',
                  ].join(' ')}
                >
                  <td className="px-5 py-3 font-medium text-[var(--color-text-primary)]">
                    {canManage && editingName?.id === player.id ? (
                      <input
                        autoFocus
                        value={editingName.value}
                        onChange={(e) => setEditingName({ id: player.id, value: e.target.value })}
                        onBlur={() => handleSaveName(player.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void handleSaveName(player.id)
                          if (e.key === 'Escape') setEditingName(null)
                        }}
                        className="w-full px-2 py-0.5 text-sm rounded border border-[var(--color-accent)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none"
                      />
                    ) : (
                      <span
                        onClick={() => canManage ? setEditingName({ id: player.id, value: player.name }) : undefined}
                        className={canManage ? 'cursor-text hover:underline decoration-dotted underline-offset-2' : ''}
                        title={canManage ? t.clickToEdit : undefined}
                      >
                        {player.name}
                      </span>
                    )}
                  </td>

                  <td className="px-5 py-3">
                    {canManage ? (
                      <RankSelect
                        locale={locale}
                        value={player.currentRank}
                        disabled={isSaving}
                        onChange={(rank) => void handleRankChange(player.id, rank)}
                      />
                    ) : player.currentRank ? (
                      <Badge variant={RANK_BADGE_VARIANT[player.currentRank as PlayerRank]}>
                        {t.rankShort[player.currentRank as PlayerRank]}
                      </Badge>
                    ) : (
                      <span className="text-xs text-[var(--color-text-muted)]">{EMPTY_MARK}</span>
                    )}
                  </td>

                  <td className="px-5 py-3">
                    {player.suggestedRank ? (
                      <span title={player.rankReason ?? undefined}>
                        <Badge variant={RANK_BADGE_VARIANT[player.suggestedRank as PlayerRank]}>
                          {t.rankShort[player.suggestedRank as PlayerRank]}
                        </Badge>
                        {player.rankReason && (
                          <span className="ml-1 text-[0.6rem] text-[var(--color-text-muted)] cursor-help">{INFO_MARK}</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--color-text-muted)]">{EMPTY_MARK}</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-center">
                    {canManage && editingProfession?.id === player.id ? (
                      <span className="inline-flex items-center gap-1">
                        <select
                          autoFocus
                          value={editingProfession.key}
                          onChange={(e) => setEditingProf({ ...editingProfession, key: e.target.value })}
                          className="text-xs px-1 py-0.5 rounded border border-[var(--color-accent)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none"
                        >
                          {PROFESSION_KEYS.map((key) => (
                            <option key={key} value={key}>{PROFESSION_ICON[key]} {key}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min={1}
                          max={MAX_PROFESSION_LEVEL}
                          value={editingProfession.level}
                          onChange={(e) => setEditingProf({ ...editingProfession, level: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void handleSaveProfession(player.id)
                            if (e.key === 'Escape') setEditingProf(null)
                          }}
                          className="w-10 text-xs px-1 py-0.5 rounded border border-[var(--color-accent)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none"
                        />
                        <button onClick={() => void handleSaveProfession(player.id)} className="text-xs px-1.5 py-0.5 rounded bg-[var(--color-accent)] text-white">{CHECK_MARK}</button>
                        <button onClick={() => setEditingProf(null)} className="text-xs px-1.5 py-0.5 rounded border border-[var(--color-border)] text-[var(--color-text-muted)]">{CROSS_MARK}</button>
                      </span>
                    ) : player.professionKey ? (
                      <span
                        onClick={() => canManage ? setEditingProf({ id: player.id, key: player.professionKey!, level: String(player.professionLevel ?? 1) }) : undefined}
                        className={`inline-flex flex-col items-center gap-0.5 ${canManage ? 'cursor-pointer hover:opacity-70' : ''}`}
                        title={canManage ? t.clickToEdit : undefined}
                      >
                        <span className="text-base leading-none">
                          {PROFESSION_ICON[player.professionKey] ?? UNKNOWN_PROFESSION_ICON}
                        </span>
                        <span className="text-[0.6rem] text-[var(--color-text-muted)] leading-none">
                          {player.professionLevel ?? EMPTY_MARK}/{MAX_PROFESSION_LEVEL}
                        </span>
                      </span>
                    ) : (
                      <span
                        onClick={() => canManage ? setEditingProf({ id: player.id, key: 'warlord', level: '1' }) : undefined}
                        className={`text-xs ${canManage ? 'cursor-pointer text-[var(--color-accent)] hover:underline' : 'text-[var(--color-text-muted)]'}`}
                        title={canManage ? t.clickToAdd : undefined}
                      >
                        {canManage ? t.addInline : EMPTY_MARK}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-center">
                    {canManage && editingLevel?.id === player.id ? (
                      <input
                        autoFocus
                        type="number"
                        min={1}
                        max={99}
                        value={editingLevel.value}
                        onChange={(e) => setEditingLevel({ id: player.id, value: e.target.value })}
                        onBlur={() => handleSaveLevel(player.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void handleSaveLevel(player.id)
                          if (e.key === 'Escape') setEditingLevel(null)
                        }}
                        className="w-14 text-xs px-1.5 py-0.5 rounded border border-[var(--color-accent)] bg-[var(--color-surface)] text-[var(--color-text-primary)] text-center focus:outline-none"
                      />
                    ) : player.generalLevel != null ? (
                      <span
                        onClick={() => canManage ? setEditingLevel({ id: player.id, value: String(player.generalLevel) }) : undefined}
                        className={`text-xs font-semibold text-[var(--color-text-primary)] ${canManage ? 'cursor-text hover:underline decoration-dotted underline-offset-2' : ''}`}
                        title={canManage ? t.clickToEdit : undefined}
                      >
                        {player.generalLevel}
                      </span>
                    ) : (
                      <span
                        onClick={() => canManage ? setEditingLevel({ id: player.id, value: '' }) : undefined}
                        className={`text-xs ${canManage ? 'cursor-pointer text-[var(--color-accent)] hover:underline' : 'text-[var(--color-text-muted)]'}`}
                        title={canManage ? t.clickToAdd : undefined}
                      >
                        {canManage ? t.addInline : EMPTY_MARK}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-center">
                    {canManage && editingJoinedAt?.id === player.id ? (
                      <input
                        autoFocus
                        type="date"
                        value={editingJoinedAt.value}
                        onChange={(e) => setEditingJoinedAt({ id: player.id, value: e.target.value })}
                        onBlur={() => handleSaveJoinedAt(player.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void handleSaveJoinedAt(player.id)
                          if (e.key === 'Escape') setEditingJoinedAt(null)
                        }}
                        className="w-32 text-xs px-1.5 py-0.5 rounded border border-[var(--color-accent)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none"
                      />
                    ) : (
                      <span
                        onClick={() => canManage ? setEditingJoinedAt({ id: player.id, value: player.joinedAt ?? '' }) : undefined}
                        className={`text-xs tabular-nums ${canManage ? 'cursor-text hover:underline decoration-dotted underline-offset-2' : ''} ${!player.joinedAt ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-primary)]'}`}
                        title={canManage ? t.clickToEdit : undefined}
                      >
                        {player.joinedAt ? formatDate(player.joinedAt, locale) : EMPTY_MARK}
                      </span>
                    )}
                  </td>

                  <td className="px-5 py-3 text-center">
                    <Badge variant={player.isActive ? 'success' : 'neutral'}>
                      {player.isActive ? t.status.active : t.status.inactive}
                    </Badge>
                  </td>

                  {canManage && (
                    <td className="px-5 py-3 text-right">
                      {confirmDelId === player.id ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="text-xs text-[var(--color-danger)] mr-1">{t.deletePrompt}</span>
                          <button
                            onClick={() => void handleDelete(player.id)}
                            disabled={isSaving}
                            className="text-xs px-2.5 py-1 rounded-md bg-[var(--color-danger)] text-white hover:opacity-90 disabled:opacity-40"
                          >
                            {isSaving ? ELLIPSIS : t.confirm}
                          </button>
                          <button
                            onClick={() => setConfirmDel(null)}
                            className="text-xs px-2.5 py-1 rounded-md border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)]"
                          >
                            {t.cancel}
                          </button>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => void handlePatch(player.id, { isActive: !player.isActive })}
                            disabled={isSaving}
                            className="text-xs px-2.5 py-1 rounded-md border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors disabled:opacity-40"
                          >
                            {player.isActive ? t.deactivate : t.reactivate}
                          </button>
                          <button
                            onClick={() => setConfirmDel(player.id)}
                            disabled={isSaving}
                            className="text-xs px-2.5 py-1 rounded-md border border-[var(--color-danger)]/30 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors disabled:opacity-40"
                          >
                            {t.delete}
                          </button>
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 8 : 7} className="px-5 py-10 text-center text-sm text-[var(--color-text-muted)]">
                    {t.noPlayers}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function formatDate(iso: string, locale: 'fr' | 'en'): string {
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-GB')
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

function RankSelect({
  locale,
  value,
  onChange,
  disabled,
}: {
  locale: 'fr' | 'en'
  value: string | null
  onChange: (rank: PlayerRank | null) => void
  disabled?: boolean
}) {
  const t = getPlayersMessages(locale)

  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange((e.target.value as PlayerRank) || null)}
      disabled={disabled}
      className={[
        'text-xs px-2 py-1 rounded border focus:outline-none focus:border-[var(--color-accent)] transition-colors disabled:opacity-40 bg-transparent',
        value
          ? 'border-[var(--color-border)] text-[var(--color-text-primary)]'
          : 'border-[var(--color-border)] text-[var(--color-text-muted)]',
      ].join(' ')}
    >
      <option value="">{EMPTY_MARK} {t.unranked}</option>
      {PLAYER_RANKS.slice().reverse().map((rank) => (
        <option key={rank} value={rank}>{t.rankLabels[rank]}</option>
      ))}
    </select>
  )
}

function AddPlayerForm({
  locale,
  onCancel,
  onCreated,
}: {
  locale: 'fr' | 'en'
  onCancel: () => void
  onCreated: (player: PlayerApi) => void
}) {
  const t = getPlayersMessages(locale)
  const [name, setName] = useState('')
  const [rank, setRank] = useState<string>('')
  const [joinedAt, setJoinedAt] = useState(() => new Date().toISOString().split('T')[0] ?? '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          currentRank: rank || undefined,
          joinedAt: joinedAt || undefined,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((data as { error?: { message?: string } })?.error?.message ?? t.addForm.createError)
      }

      const player = (data as { data?: PlayerApi }).data
      if (!player) {
        throw new Error(t.addForm.invalidResponse)
      }

      onCreated(player)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.unknown)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 p-4 rounded-xl border border-[var(--color-accent)]/20 bg-[var(--color-surface-raised)]">
      <div className="flex-1 min-w-[160px]">
        <label className="label-xs block mb-1">{t.addForm.name}</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.addForm.placeholder}
          required
          className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
        />
      </div>
      <div className="min-w-[160px]">
        <label className="label-xs block mb-1">{t.addForm.initialRank}</label>
        <select
          value={rank}
          onChange={(e) => setRank(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
        >
          <option value="">{EMPTY_MARK} {t.unranked}</option>
          {PLAYER_RANKS.slice().reverse().map((playerRank) => (
            <option key={playerRank} value={playerRank}>{t.rankLabels[playerRank]}</option>
          ))}
        </select>
      </div>
      <div className="min-w-[140px]">
        <label className="label-xs block mb-1">{t.addForm.joinedAt}</label>
        <input
          type="date"
          value={joinedAt}
          onChange={(e) => setJoinedAt(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="px-4 py-2 text-sm bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-40"
        >
          {loading ? ELLIPSIS : t.addForm.create}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm border border-[var(--color-border)] text-[var(--color-text-muted)] rounded-lg hover:bg-[var(--color-surface-raised)] transition-colors"
        >
          {t.cancel}
        </button>
      </div>
      {error && <p className="w-full text-xs text-[var(--color-danger)]">{error}</p>}
    </form>
  )
}
