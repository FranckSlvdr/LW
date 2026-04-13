'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PLAYER_RANKS, RANK_LABEL } from '@/types/domain'
import type { PlayerApi } from '@/types/api'
import type { PlayerRank } from '@/types/domain'

// ─── Profession helpers ───────────────────────────────────────────────────────

const PROFESSION_ICON: Record<string, string> = {
  farmer:     '🌾',
  fighter:    '⚔️',
  builder:    '🏗️',
  researcher: '🔬',
  explorer:   '🗺️',
}

const MAX_PROFESSION_LEVEL = 10

// ─── Rank display helpers ─────────────────────────────────────────────────────

const RANK_BADGE_VARIANT: Record<PlayerRank, 'danger' | 'warning' | 'success' | 'info' | 'neutral'> = {
  R5: 'danger',
  R4: 'warning',
  R3: 'success',
  R2: 'info',
  R1: 'neutral',
}

const RANK_SHORT: Record<PlayerRank, string> = {
  R5: 'R5 Leader',
  R4: 'R4 Officier',
  R3: 'R3 Actif',
  R2: 'R2 Occasionnel',
  R1: 'R1 Inactif',
}

const PROFESSION_KEYS = Object.keys(PROFESSION_ICON)

// ─── Main component ───────────────────────────────────────────────────────────

interface PlayersTableProps {
  players: PlayerApi[]
  canManage: boolean
}

type FilterStatus = 'all' | 'active' | 'inactive'
type FilterRank   = 'all' | 'unclassified' | PlayerRank

interface EditingName       { id: number; value: string }
interface EditingLevel      { id: number; value: string }
interface EditingProfession { id: number; key: string; level: string }

export function PlayersTable({ players, canManage }: PlayersTableProps) {
  const [showAdd,          setShowAdd]        = useState(false)
  const [filterStatus,     setStatus]         = useState<FilterStatus>('all')
  const [filterRank,       setRank]           = useState<FilterRank>('all')
  const [confirmDelId,     setConfirmDel]     = useState<number | null>(null)
  const [deleteError,      setDeleteError]    = useState<string | null>(null)
  const [isDeleting,       setIsDeleting]     = useState(false)
  const [editingName,      setEditingName]    = useState<EditingName | null>(null)
  const [editingLevel,     setEditingLevel]   = useState<EditingLevel | null>(null)
  const [editingProfession,setEditingProf]    = useState<EditingProfession | null>(null)
  const router                               = useRouter()
  const [isPending, startTransition]         = useTransition()

  const filtered = players.filter((p) => {
    const statusOk = filterStatus === 'all' || (filterStatus === 'active' ? p.isActive : !p.isActive)
    const rankOk =
      filterRank === 'all' ||
      (filterRank === 'unclassified' ? !p.currentRank : p.currentRank === filterRank)
    return statusOk && rankOk
  })

  async function handlePatch(playerId: number, body: Record<string, unknown>) {
    await fetch(`/api/players/${playerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    startTransition(() => router.refresh())
  }

  async function handleDelete(playerId: number) {
    setDeleteError(null)
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/players/${playerId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setDeleteError((data as { error?: { message?: string } })?.error?.message ?? 'Erreur lors de la suppression')
        return
      }
      setConfirmDel(null)
      router.refresh()
    } catch {
      setDeleteError('Erreur réseau — veuillez réessayer')
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleSaveName(playerId: number) {
    if (!editingName || editingName.id !== playerId) return
    const name = editingName.value.trim()
    setEditingName(null)
    if (!name) return
    const currentPlayer = players.find((p) => p.id === playerId)
    if (name === currentPlayer?.name) return
    await handlePatch(playerId, { name })
  }

  async function handleSaveLevel(playerId: number) {
    if (!editingLevel || editingLevel.id !== playerId) return
    const raw = editingLevel.value.trim()
    setEditingLevel(null)
    const generalLevel = raw === '' ? null : Number(raw)
    if (isNaN(generalLevel as number)) return
    const currentPlayer = players.find((p) => p.id === playerId)
    if (generalLevel === currentPlayer?.generalLevel) return
    await handlePatch(playerId, { generalLevel })
  }

  async function handleSaveProfession(playerId: number) {
    if (!editingProfession || editingProfession.id !== playerId) return
    const { key, level: rawLevel } = editingProfession
    setEditingProf(null)
    const level = Number(rawLevel)
    if (!key || isNaN(level) || level < 1 || level > MAX_PROFESSION_LEVEL) return
    await fetch('/api/professions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, professionKey: key, level }),
    })
    startTransition(() => router.refresh())
  }

  // Rank counts for summary strip
  const rankCounts = PLAYER_RANKS.reduce<Record<string, number>>((acc, r) => {
    acc[r] = players.filter((p) => p.isActive && p.currentRank === r).length
    return acc
  }, {})
  const unclassified = players.filter((p) => p.isActive && !p.currentRank).length

  return (
    <div className="space-y-4">
      {/* Rank summary strip */}
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
          <p className="text-xs font-bold text-[var(--color-text-primary)]">{unclassified}</p>
          <p className="text-[0.6rem] text-[var(--color-text-muted)] mt-0.5">Non classé</p>
        </button>
      </div>

      <Card padding="none">
        <div className="p-5 pb-3">
          <CardHeader
            title="Liste des joueurs"
            subtitle={`${filtered.length} / ${players.length} joueurs`}
            action={
              <div className="flex items-center gap-2 flex-wrap">
                {/* Status filter */}
                <div className="flex rounded-lg border border-[var(--color-border)] overflow-hidden text-xs">
                  {(['all', 'active', 'inactive'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setStatus(f)}
                      className={[
                        'px-3 py-1.5 transition-colors',
                        filterStatus === f
                          ? 'bg-[var(--color-accent)] text-white'
                          : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)]',
                      ].join(' ')}
                    >
                      {f === 'all' ? 'Tous' : f === 'active' ? 'Actifs' : 'Inactifs'}
                    </button>
                  ))}
                </div>
                {canManage && (
                  <button
                    onClick={() => setShowAdd(true)}
                    className="px-3 py-1.5 text-xs bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors"
                  >
                    + Ajouter
                  </button>
                )}
              </div>
            }
          />
        </div>

        {canManage && showAdd && (
          <div className="mx-5 mb-4">
            <AddPlayerForm onDone={() => { setShowAdd(false); startTransition(() => router.refresh()) }} />
          </div>
        )}

        {deleteError && (
          <div className="mx-5 mb-3 px-4 py-2.5 rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 text-sm text-[var(--color-danger)] flex items-center justify-between gap-3">
            <span>{deleteError}</span>
            <button onClick={() => setDeleteError(null)} className="text-[var(--color-danger)] hover:opacity-70 shrink-0">✕</button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-[var(--color-border)] bg-[var(--color-surface-raised)]/40">
                <th className="px-5 py-3 text-left text-[var(--color-text-muted)] font-medium text-xs">Joueur</th>
                <th className="px-5 py-3 text-left text-[var(--color-text-muted)] font-medium text-xs">Rang actuel</th>
                <th className="px-5 py-3 text-left text-[var(--color-text-muted)] font-medium text-xs">Suggestion app</th>
                <th className="px-4 py-3 text-center text-[var(--color-text-muted)] font-medium text-xs">Profession</th>
                <th className="px-4 py-3 text-center text-[var(--color-text-muted)] font-medium text-xs">Niv. général</th>
                <th className="px-5 py-3 text-center text-[var(--color-text-muted)] font-medium text-xs">Statut</th>
                {canManage && <th className="px-5 py-3 text-right text-[var(--color-text-muted)] font-medium text-xs">Actions</th>}
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
                          if (e.key === 'Enter') handleSaveName(player.id)
                          if (e.key === 'Escape') setEditingName(null)
                        }}
                        className="w-full px-2 py-0.5 text-sm rounded border border-[var(--color-accent)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none"
                      />
                    ) : (
                      <span
                        onClick={() => canManage ? setEditingName({ id: player.id, value: player.name }) : undefined}
                        className={canManage ? 'cursor-text hover:underline decoration-dotted underline-offset-2' : ''}
                        title={canManage ? 'Cliquer pour modifier' : undefined}
                      >
                        {player.name}
                      </span>
                    )}
                  </td>

                  {/* Current rank */}
                  <td className="px-5 py-3">
                    {canManage ? (
                      <RankSelect
                        value={player.currentRank}
                        disabled={isPending}
                        onChange={(rank) => handlePatch(player.id, { currentRank: rank })}
                      />
                    ) : player.currentRank ? (
                      <Badge variant={RANK_BADGE_VARIANT[player.currentRank as PlayerRank]}>
                        {RANK_SHORT[player.currentRank as PlayerRank]}
                      </Badge>
                    ) : (
                      <span className="text-xs text-[var(--color-text-muted)]">—</span>
                    )}
                  </td>

                  {/* Suggested rank — read-only with reason tooltip */}
                  <td className="px-5 py-3">
                    {player.suggestedRank ? (
                      <span title={player.rankReason ?? undefined}>
                        <Badge variant={RANK_BADGE_VARIANT[player.suggestedRank as PlayerRank]}>
                          {RANK_SHORT[player.suggestedRank as PlayerRank]}
                        </Badge>
                        {player.rankReason && (
                          <span className="ml-1 text-[0.6rem] text-[var(--color-text-muted)] cursor-help">ⓘ</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--color-text-muted)]">—</span>
                    )}
                  </td>

                  {/* Profession */}
                  <td className="px-4 py-3 text-center">
                    {canManage && editingProfession?.id === player.id ? (
                      <span className="inline-flex items-center gap-1">
                        <select
                          autoFocus
                          value={editingProfession.key}
                          onChange={(e) => setEditingProf({ ...editingProfession, key: e.target.value })}
                          className="text-xs px-1 py-0.5 rounded border border-[var(--color-accent)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none"
                        >
                          {PROFESSION_KEYS.map((k) => (
                            <option key={k} value={k}>{PROFESSION_ICON[k]} {k}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min={1}
                          max={MAX_PROFESSION_LEVEL}
                          value={editingProfession.level}
                          onChange={(e) => setEditingProf({ ...editingProfession, level: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveProfession(player.id)
                            if (e.key === 'Escape') setEditingProf(null)
                          }}
                          className="w-10 text-xs px-1 py-0.5 rounded border border-[var(--color-accent)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none"
                        />
                        <button
                          onClick={() => handleSaveProfession(player.id)}
                          className="text-xs px-1.5 py-0.5 rounded bg-[var(--color-accent)] text-white"
                        >✓</button>
                        <button
                          onClick={() => setEditingProf(null)}
                          className="text-xs px-1.5 py-0.5 rounded border border-[var(--color-border)] text-[var(--color-text-muted)]"
                        >✕</button>
                      </span>
                    ) : player.professionKey ? (
                      <span
                        onClick={() => canManage ? setEditingProf({ id: player.id, key: player.professionKey!, level: String(player.professionLevel ?? 1) }) : undefined}
                        className={`inline-flex flex-col items-center gap-0.5 ${canManage ? 'cursor-pointer hover:opacity-70' : ''}`}
                        title={canManage ? 'Cliquer pour modifier' : undefined}
                      >
                        <span className="text-base leading-none">
                          {PROFESSION_ICON[player.professionKey] ?? '❓'}
                        </span>
                        <span className="text-[0.6rem] text-[var(--color-text-muted)] leading-none">
                          {player.professionLevel ?? '—'}/{MAX_PROFESSION_LEVEL}
                        </span>
                      </span>
                    ) : (
                      <span
                        onClick={() => canManage ? setEditingProf({ id: player.id, key: 'fighter', level: '1' }) : undefined}
                        className={`text-xs ${canManage ? 'cursor-pointer text-[var(--color-accent)] hover:underline' : 'text-[var(--color-text-muted)]'}`}
                        title={canManage ? 'Cliquer pour ajouter' : undefined}
                      >
                        {canManage ? '+ ajouter' : '—'}
                      </span>
                    )}
                  </td>

                  {/* General level */}
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
                          if (e.key === 'Enter') handleSaveLevel(player.id)
                          if (e.key === 'Escape') setEditingLevel(null)
                        }}
                        className="w-14 text-xs px-1.5 py-0.5 rounded border border-[var(--color-accent)] bg-[var(--color-surface)] text-[var(--color-text-primary)] text-center focus:outline-none"
                      />
                    ) : player.generalLevel != null ? (
                      <span
                        onClick={() => canManage ? setEditingLevel({ id: player.id, value: String(player.generalLevel) }) : undefined}
                        className={`text-xs font-semibold text-[var(--color-text-primary)] ${canManage ? 'cursor-text hover:underline decoration-dotted underline-offset-2' : ''}`}
                        title={canManage ? 'Cliquer pour modifier' : undefined}
                      >
                        {player.generalLevel}
                      </span>
                    ) : (
                      <span
                        onClick={() => canManage ? setEditingLevel({ id: player.id, value: '' }) : undefined}
                        className={`text-xs ${canManage ? 'cursor-pointer text-[var(--color-accent)] hover:underline' : 'text-[var(--color-text-muted)]'}`}
                        title={canManage ? 'Cliquer pour ajouter' : undefined}
                      >
                        {canManage ? '+ ajouter' : '—'}
                      </span>
                    )}
                  </td>

                  <td className="px-5 py-3 text-center">
                    <Badge variant={player.isActive ? 'success' : 'neutral'}>
                      {player.isActive ? 'Actif' : 'Inactif'}
                    </Badge>
                  </td>

                  {canManage && (
                    <td className="px-5 py-3 text-right">
                      {confirmDelId === player.id ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="text-xs text-[var(--color-danger)] mr-1">Supprimer ?</span>
                          <button
                            onClick={() => handleDelete(player.id)}
                            disabled={isDeleting}
                            className="text-xs px-2.5 py-1 rounded-md bg-[var(--color-danger)] text-white hover:opacity-90 disabled:opacity-40"
                          >
                            {isDeleting ? '…' : 'Confirmer'}
                          </button>
                          <button
                            onClick={() => setConfirmDel(null)}
                            className="text-xs px-2.5 py-1 rounded-md border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)]"
                          >
                            Annuler
                          </button>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handlePatch(player.id, { isActive: !player.isActive })}
                            disabled={isPending}
                            className="text-xs px-2.5 py-1 rounded-md border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors disabled:opacity-40"
                          >
                            {player.isActive ? 'Désactiver' : 'Réactiver'}
                          </button>
                          <button
                            onClick={() => setConfirmDel(player.id)}
                            disabled={isPending}
                            className="text-xs px-2.5 py-1 rounded-md border border-[var(--color-danger)]/30 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors disabled:opacity-40"
                          >
                            Supprimer
                          </button>
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 7 : 6} className="px-5 py-10 text-center text-sm text-[var(--color-text-muted)]">
                    Aucun joueur correspondant
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

// ─── Rank select ──────────────────────────────────────────────────────────────

function RankSelect({
  value,
  onChange,
  disabled,
}: {
  value: string | null
  onChange: (rank: PlayerRank | null) => void
  disabled?: boolean
}) {
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
      <option value="">— Non classé</option>
      {PLAYER_RANKS.slice().reverse().map((r) => (
        <option key={r} value={r}>{RANK_LABEL[r]}</option>
      ))}
    </select>
  )
}

// ─── Add player form ──────────────────────────────────────────────────────────

function AddPlayerForm({ onDone }: { onDone: () => void }) {
  const [name,    setName]    = useState('')
  const [rank,    setRank]    = useState<string>('')
  const [error,   setError]   = useState<string | null>(null)
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
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data?.error?.message ?? 'Erreur lors de la création')
      }
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 p-4 rounded-xl border border-[var(--color-accent)]/20 bg-[var(--color-surface-raised)]">
      <div className="flex-1 min-w-[160px]">
        <label className="label-xs block mb-1">Nom *</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Pseudo in-game"
          required
          className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
        />
      </div>
      <div className="min-w-[160px]">
        <label className="label-xs block mb-1">Rang initial</label>
        <select
          value={rank}
          onChange={(e) => setRank(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
        >
          <option value="">— Non classé</option>
          {PLAYER_RANKS.slice().reverse().map((r) => (
            <option key={r} value={r}>{RANK_LABEL[r]}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="px-4 py-2 text-sm bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-40"
        >
          {loading ? '…' : 'Créer'}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="px-4 py-2 text-sm border border-[var(--color-border)] text-[var(--color-text-muted)] rounded-lg hover:bg-[var(--color-surface-raised)] transition-colors"
        >
          Annuler
        </button>
      </div>
      {error && <p className="w-full text-xs text-[var(--color-danger)]">{error}</p>}
    </form>
  )
}
