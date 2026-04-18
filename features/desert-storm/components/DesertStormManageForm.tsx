'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import type { PlayerApi, DsRegistrationApi, DsTeam, DsRole } from '@/types/api'

// ─── Constantes ───────────────────────────────────────────────────────────────

const MAX_TITU = 20
const MAX_REMP = 10

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }
const TOP3_LABELS: Record<string, string> = { '': '—', '1': '1er', '2': '2e', '3': '3e' }

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  weekId: number
  players: PlayerApi[]
  registrations: DsRegistrationApi[]
  canEdit: boolean
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function DesertStormManageForm({ weekId, players, registrations, canEdit }: Props) {
  const [regs, setRegs]       = useState<DsRegistrationApi[]>(registrations)
  const [pending, setPending] = useState<Set<number>>(new Set())
  const [error, setError]     = useState<string | null>(null)

  // Joueurs non encore inscrits
  const registeredIds    = new Set(regs.map((r) => r.playerId))
  const unregistered     = players.filter((p) => !registeredIds.has(p.id))

  // ─── Mutations ──────────────────────────────────────────────────────────────

  function setPlayerPending(playerId: number, on: boolean) {
    setPending((prev) => {
      const next = new Set(prev)
      if (on) next.add(playerId)
      else next.delete(playerId)
      return next
    })
  }

  async function apiPost(body: object): Promise<DsRegistrationApi | null> {
    const res  = await fetch('/api/desert-storm', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.error?.message ?? `Erreur ${res.status}`)
    return (data?.data ?? null) as DsRegistrationApi | null
  }

  async function apiDelete(playerId: number): Promise<void> {
    const res = await fetch('/api/desert-storm', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ playerId, weekId }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data?.error?.message ?? `Erreur ${res.status}`)
    }
  }

  // ─── Handlers ───────────────────────────────────────────────────────────────

  async function handleAdd(playerId: number, team: DsTeam, role: DsRole) {
    setPlayerPending(playerId, true)
    setError(null)
    try {
      const saved = await apiPost({ playerId, weekId, team, role, present: true, top3Rank: null })
      if (saved) setRegs((prev) => [...prev, saved])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setPlayerPending(playerId, false)
    }
  }

  async function handleRemove(reg: DsRegistrationApi) {
    setPlayerPending(reg.playerId, true)
    setError(null)
    try {
      await apiDelete(reg.playerId)
      setRegs((prev) => prev.filter((r) => r.playerId !== reg.playerId))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setPlayerPending(reg.playerId, false)
    }
  }

  async function handleTogglePresent(reg: DsRegistrationApi) {
    const updated = { ...reg, present: !reg.present }
    setRegs((prev) => prev.map((r) => r.playerId === reg.playerId ? updated : r))
    setPlayerPending(reg.playerId, true)
    try {
      await apiPost({ ...updated, weekId })
    } catch (e) {
      // Rollback
      setRegs((prev) => prev.map((r) => r.playerId === reg.playerId ? reg : r))
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setPlayerPending(reg.playerId, false)
    }
  }

  async function handleSetTop3(reg: DsRegistrationApi, rank: 1 | 2 | 3 | null) {
    // Optimisme : désassigner l'éventuel joueur déjà à ce rang dans la même équipe
    setRegs((prev) => prev.map((r) => {
      if (rank !== null && r.team === reg.team && r.top3Rank === rank && r.playerId !== reg.playerId) {
        return { ...r, top3Rank: null }
      }
      if (r.playerId === reg.playerId) return { ...r, top3Rank: rank }
      return r
    }))
    setPlayerPending(reg.playerId, true)
    try {
      await apiPost({ ...reg, weekId, top3Rank: rank })
    } catch (e) {
      // Rollback
      setRegs((prev) => prev.map((r) => r.playerId === reg.playerId ? reg : r))
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setPlayerPending(reg.playerId, false)
    }
  }

  // ─── Rendu ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20">
          <span className="text-sm text-[var(--color-danger)]">{error}</span>
          <button onClick={() => setError(null)} className="text-sm text-[var(--color-danger)] hover:opacity-70">×</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TeamPanel
          team="A"
          weekId={weekId}
          regs={regs.filter((r) => r.team === 'A')}
          unregistered={unregistered}
          pending={pending}
          canEdit={canEdit}
          onAdd={handleAdd}
          onRemove={handleRemove}
          onTogglePresent={handleTogglePresent}
          onSetTop3={handleSetTop3}
        />
        <TeamPanel
          team="B"
          weekId={weekId}
          regs={regs.filter((r) => r.team === 'B')}
          unregistered={unregistered}
          pending={pending}
          canEdit={canEdit}
          onAdd={handleAdd}
          onRemove={handleRemove}
          onTogglePresent={handleTogglePresent}
          onSetTop3={handleSetTop3}
        />
      </div>
    </div>
  )
}

// ─── TeamPanel ────────────────────────────────────────────────────────────────

interface TeamPanelProps {
  team: DsTeam
  weekId: number
  regs: DsRegistrationApi[]
  unregistered: PlayerApi[]
  pending: Set<number>
  canEdit: boolean
  onAdd: (playerId: number, team: DsTeam, role: DsRole) => void
  onRemove: (reg: DsRegistrationApi) => void
  onTogglePresent: (reg: DsRegistrationApi) => void
  onSetTop3: (reg: DsRegistrationApi, rank: 1 | 2 | 3 | null) => void
}

function TeamPanel({ team, regs, unregistered, pending, canEdit, onAdd, onRemove, onTogglePresent, onSetTop3 }: TeamPanelProps) {
  const titu = regs.filter((r) => r.role === 'titulaire')
  const remp = regs.filter((r) => r.role === 'remplaçant')
  const absents = regs.filter((r) => !r.present).length

  return (
    <Card padding="none">
      {/* En-tête équipe */}
      <div className="px-5 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface-raised)]/40">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
            Équipe {team}
          </h3>
          <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
            <span>{regs.length} inscrits</span>
            {absents > 0 && <span className="text-[var(--color-danger)]">{absents} absent{absents > 1 ? 's' : ''}</span>}
          </div>
        </div>
        {/* Top 3 résumé */}
        {regs.some((r) => r.top3Rank !== null) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {([1, 2, 3] as const).map((rank) => {
              const player = regs.find((r) => r.top3Rank === rank)
              return player ? (
                <span key={rank} className="text-xs font-medium">
                  {MEDAL[rank]} {player.playerName}
                </span>
              ) : null
            })}
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        <RoleSection
          label="Titulaires"
          max={MAX_TITU}
          role="titulaire"
          team={team}
          regs={titu}
          unregistered={unregistered}
          pending={pending}
          canEdit={canEdit}
          onAdd={onAdd}
          onRemove={onRemove}
          onTogglePresent={onTogglePresent}
          onSetTop3={onSetTop3}
        />
        <RoleSection
          label="Remplaçants"
          max={MAX_REMP}
          role="remplaçant"
          team={team}
          regs={remp}
          unregistered={unregistered}
          pending={pending}
          canEdit={canEdit}
          onAdd={onAdd}
          onRemove={onRemove}
          onTogglePresent={onTogglePresent}
          onSetTop3={onSetTop3}
        />
      </div>
    </Card>
  )
}

// ─── RoleSection ──────────────────────────────────────────────────────────────

interface RoleSectionProps {
  label: string
  max: number
  role: DsRole
  team: DsTeam
  regs: DsRegistrationApi[]
  unregistered: PlayerApi[]
  pending: Set<number>
  canEdit: boolean
  onAdd: (playerId: number, team: DsTeam, role: DsRole) => void
  onRemove: (reg: DsRegistrationApi) => void
  onTogglePresent: (reg: DsRegistrationApi) => void
  onSetTop3: (reg: DsRegistrationApi, rank: 1 | 2 | 3 | null) => void
}

function RoleSection({ label, max, role, team, regs, unregistered, pending, canEdit, onAdd, onRemove, onTogglePresent, onSetTop3 }: RoleSectionProps) {
  const [adding, setAdding]           = useState(false)
  const [selectedId, setSelectedId]   = useState<string>('')
  const [addLoading, setAddLoading]   = useState(false)

  const full = regs.length >= max

  async function handleAdd() {
    if (!selectedId) return
    setAddLoading(true)
    await onAdd(Number(selectedId), team, role)
    setSelectedId('')
    setAdding(false)
    setAddLoading(false)
  }

  return (
    <div>
      {/* En-tête section */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
          {label}
        </span>
        <span className={`text-xs font-medium ${full ? 'text-[var(--color-warning,#f59e0b)]' : 'text-[var(--color-text-muted)]'}`}>
          {regs.length}/{max}
        </span>
      </div>

      {/* Liste des joueurs */}
      <div className="space-y-1">
        {regs.length === 0 && (
          <p className="text-xs text-[var(--color-text-muted)] py-1 px-2">Aucun joueur inscrit</p>
        )}
        {regs.map((reg) => (
          <PlayerRow
            key={reg.playerId}
            reg={reg}
            isPending={pending.has(reg.playerId)}
            canEdit={canEdit}
            onRemove={onRemove}
            onTogglePresent={onTogglePresent}
            onSetTop3={onSetTop3}
          />
        ))}
      </div>

      {/* Ajouter un joueur */}
      {canEdit && (
        <div className="mt-2">
          {adding ? (
            <div className="flex gap-2 items-center">
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="flex-1 min-w-0 text-xs px-2 py-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
              >
                <option value="">Choisir un joueur…</option>
                {unregistered.map((p) => (
                  <option key={p.id} value={String(p.id)}>{p.name}</option>
                ))}
              </select>
              <button
                onClick={handleAdd}
                disabled={!selectedId || addLoading}
                className="px-3 py-1.5 text-xs bg-[var(--color-accent)] text-white rounded-md disabled:opacity-40 hover:bg-[var(--color-accent-hover)] transition-colors"
              >
                {addLoading ? '…' : 'Ajouter'}
              </button>
              <button
                onClick={() => { setAdding(false); setSelectedId('') }}
                className="px-2 py-1.5 text-xs text-[var(--color-text-muted)] border border-[var(--color-border)] rounded-md hover:border-[var(--color-text-muted)] transition-colors"
              >
                ×
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              disabled={full || unregistered.length === 0}
              className="text-xs text-[var(--color-accent)] hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-default transition-opacity"
            >
              {full ? `Capacité max atteinte (${max})` : '+ Ajouter un joueur'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── PlayerRow ────────────────────────────────────────────────────────────────

interface PlayerRowProps {
  reg: DsRegistrationApi
  isPending: boolean
  canEdit: boolean
  onRemove: (reg: DsRegistrationApi) => void
  onTogglePresent: (reg: DsRegistrationApi) => void
  onSetTop3: (reg: DsRegistrationApi, rank: 1 | 2 | 3 | null) => void
}

function PlayerRow({ reg, isPending, canEdit, onRemove, onTogglePresent, onSetTop3 }: PlayerRowProps) {
  return (
    <div className={[
      'flex items-center gap-2 px-2 py-1.5 rounded-md',
      isPending ? 'opacity-50' : '',
      !reg.present ? 'bg-[var(--color-danger)]/5' : 'hover:bg-[var(--color-surface-raised)]',
    ].join(' ')}>

      {/* Médaille top3 */}
      <span className="text-sm w-4 text-center shrink-0">
        {reg.top3Rank ? MEDAL[reg.top3Rank] : ''}
      </span>

      {/* Nom joueur */}
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium truncate ${!reg.present ? 'line-through text-[var(--color-text-muted)]' : 'text-[var(--color-text-primary)]'}`}>
          {reg.playerName}
        </p>
        {reg.playerAlias && (
          <p className="text-[0.65rem] text-[var(--color-text-muted)] truncate">{reg.playerAlias}</p>
        )}
      </div>

      {/* Badge présence */}
      {canEdit ? (
        <button
          onClick={() => onTogglePresent(reg)}
          disabled={isPending}
          className={[
            'shrink-0 text-[0.65rem] font-semibold px-1.5 py-0.5 rounded border transition-colors',
            reg.present
              ? 'text-[var(--color-success,#22c55e)] border-[var(--color-success,#22c55e)]/30 bg-[var(--color-success,#22c55e)]/10'
              : 'text-[var(--color-danger)] border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10',
          ].join(' ')}
        >
          {reg.present ? 'Présent' : 'Absent'}
        </button>
      ) : (
        <span className={[
          'shrink-0 text-[0.65rem] font-semibold px-1.5 py-0.5 rounded border',
          reg.present
            ? 'text-[var(--color-success,#22c55e)] border-[var(--color-success,#22c55e)]/30 bg-[var(--color-success,#22c55e)]/10'
            : 'text-[var(--color-danger)] border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10',
        ].join(' ')}>
          {reg.present ? 'Présent' : 'Absent'}
        </span>
      )}

      {/* Top 3 selector */}
      {canEdit ? (
        <select
          value={reg.top3Rank !== null ? String(reg.top3Rank) : ''}
          onChange={(e) => {
            const val = e.target.value
            onSetTop3(reg, val === '' ? null : (Number(val) as 1 | 2 | 3))
          }}
          disabled={isPending}
          className="shrink-0 text-[0.65rem] px-1.5 py-0.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
        >
          {Object.entries(TOP3_LABELS).map(([val, lbl]) => (
            <option key={val} value={val}>{lbl}</option>
          ))}
        </select>
      ) : reg.top3Rank !== null ? (
        <span className="shrink-0 text-[0.65rem] font-semibold text-[var(--color-text-muted)]">
          {TOP3_LABELS[String(reg.top3Rank)]}
        </span>
      ) : null}

      {/* Supprimer */}
      {canEdit && (
        <button
          onClick={() => onRemove(reg)}
          disabled={isPending}
          className="shrink-0 w-5 h-5 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors disabled:opacity-40 text-sm"
          title="Retirer"
        >
          ×
        </button>
      )}
    </div>
  )
}
