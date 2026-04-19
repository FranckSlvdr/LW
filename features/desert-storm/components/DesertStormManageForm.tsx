'use client'

import { useState } from 'react'
import { useI18n } from '@/lib/i18n/client'
import { Card } from '@/components/ui/Card'
import type { PlayerApi, DsRegistrationApi, DsTeam, DsRole } from '@/types/api'
import { getDesertStormMessages } from '../messages'

const MAX_TITU = 20
const MAX_REMP = 10

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

interface Props {
  weekId: number
  players: PlayerApi[]
  registrations: DsRegistrationApi[]
  canEdit: boolean
}

export function DesertStormManageForm({ weekId, players, registrations, canEdit }: Props) {
  const { locale } = useI18n()
  const t = getDesertStormMessages(locale).manage
  const [regs, setRegs] = useState<DsRegistrationApi[]>(registrations)
  const [pending, setPending] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const registeredIds = new Set(regs.map((r) => r.playerId))
  const unregistered = players.filter((p) => !registeredIds.has(p.id))

  function setPlayerPending(playerId: number, on: boolean) {
    setPending((prev) => {
      const next = new Set(prev)
      if (on) next.add(playerId)
      else next.delete(playerId)
      return next
    })
  }

  async function apiPost(body: object): Promise<DsRegistrationApi | null> {
    const res = await fetch('/api/desert-storm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.error?.message ?? t.error)
    return (data?.data ?? null) as DsRegistrationApi | null
  }

  async function apiDelete(playerId: number): Promise<void> {
    const res = await fetch('/api/desert-storm', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, weekId }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data?.error?.message ?? t.error)
    }
  }

  async function handleAdd(playerId: number, team: DsTeam, role: DsRole) {
    setPlayerPending(playerId, true)
    setError(null)
    try {
      const saved = await apiPost({ playerId, weekId, team, role, present: true, top3Rank: null })
      if (saved) setRegs((prev) => [...prev, saved])
    } catch (e) {
      setError(e instanceof Error ? e.message : t.error)
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
      setError(e instanceof Error ? e.message : t.error)
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
      setRegs((prev) => prev.map((r) => r.playerId === reg.playerId ? reg : r))
      setError(e instanceof Error ? e.message : t.error)
    } finally {
      setPlayerPending(reg.playerId, false)
    }
  }

  async function handleSetTop3(reg: DsRegistrationApi, rank: 1 | 2 | 3 | null) {
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
      setRegs((prev) => prev.map((r) => r.playerId === reg.playerId ? reg : r))
      setError(e instanceof Error ? e.message : t.error)
    } finally {
      setPlayerPending(reg.playerId, false)
    }
  }

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

interface TeamPanelProps {
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

function TeamPanel({ team, regs, unregistered, pending, canEdit, onAdd, onRemove, onTogglePresent, onSetTop3 }: TeamPanelProps) {
  const { locale } = useI18n()
  const t = getDesertStormMessages(locale).manage
  const starters = regs.filter((r) => r.role === 'titulaire')
  const substitutes = regs.filter((r) => r.role === 'remplaçant')
  const absents = regs.filter((r) => !r.present).length

  return (
    <Card padding="none">
      <div className="px-5 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface-raised)]/40">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Team {team}</h3>
          <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
            <span>{regs.length} {t.registered}</span>
            {absents > 0 && <span className="text-[var(--color-danger)]">{absents} {t.absent}{absents > 1 ? 's' : ''}</span>}
          </div>
        </div>
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
          label={t.starters}
          max={MAX_TITU}
          role="titulaire"
          team={team}
          regs={starters}
          unregistered={unregistered}
          pending={pending}
          canEdit={canEdit}
          onAdd={onAdd}
          onRemove={onRemove}
          onTogglePresent={onTogglePresent}
          onSetTop3={onSetTop3}
        />
        <RoleSection
          label={t.substitutes}
          max={MAX_REMP}
          role="remplaçant"
          team={team}
          regs={substitutes}
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
  const { locale } = useI18n()
  const t = getDesertStormMessages(locale).manage
  const [adding, setAdding] = useState(false)
  const [selectedId, setSelectedId] = useState<string>('')
  const [addLoading, setAddLoading] = useState(false)
  const full = regs.length >= max

  async function handleAddClick() {
    if (!selectedId) return
    setAddLoading(true)
    await onAdd(Number(selectedId), team, role)
    setSelectedId('')
    setAdding(false)
    setAddLoading(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">{label}</span>
        <span className={`text-xs font-medium ${full ? 'text-[var(--color-warning,#f59e0b)]' : 'text-[var(--color-text-muted)]'}`}>{regs.length}/{max}</span>
      </div>

      <div className="space-y-1">
        {regs.length === 0 && (
          <p className="text-xs text-[var(--color-text-muted)] py-1 px-2">{t.noPlayer}</p>
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

      {canEdit && (
        <div className="mt-2">
          {adding ? (
            <div className="flex gap-2 items-center">
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="flex-1 min-w-0 text-xs px-2 py-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
              >
                <option value="">{t.choosePlayer}</option>
                {unregistered.map((p) => (
                  <option key={p.id} value={String(p.id)}>{p.name}</option>
                ))}
              </select>
              <button
                onClick={handleAddClick}
                disabled={!selectedId || addLoading}
                className="px-3 py-1.5 text-xs bg-[var(--color-accent)] text-white rounded-md disabled:opacity-40 hover:bg-[var(--color-accent-hover)] transition-colors"
              >
                {addLoading ? '…' : t.add}
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
              {full ? `${t.maxReached} (${max})` : t.addPlayer}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

interface PlayerRowProps {
  reg: DsRegistrationApi
  isPending: boolean
  canEdit: boolean
  onRemove: (reg: DsRegistrationApi) => void
  onTogglePresent: (reg: DsRegistrationApi) => void
  onSetTop3: (reg: DsRegistrationApi, rank: 1 | 2 | 3 | null) => void
}

function PlayerRow({ reg, isPending, canEdit, onRemove, onTogglePresent, onSetTop3 }: PlayerRowProps) {
  const { locale } = useI18n()
  const t = getDesertStormMessages(locale).manage

  return (
    <div className={[
      'flex items-center gap-2 px-2 py-1.5 rounded-md',
      isPending ? 'opacity-50' : '',
      !reg.present ? 'bg-[var(--color-danger)]/5' : 'hover:bg-[var(--color-surface-raised)]',
    ].join(' ')}>
      <span className="text-sm w-4 text-center shrink-0">
        {reg.top3Rank ? MEDAL[reg.top3Rank] : ''}
      </span>

      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium truncate ${!reg.present ? 'line-through text-[var(--color-text-muted)]' : 'text-[var(--color-text-primary)]'}`}>
          {reg.playerName}
        </p>
        {reg.playerAlias && (
          <p className="text-[0.65rem] text-[var(--color-text-muted)] truncate">{reg.playerAlias}</p>
        )}
      </div>

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
          {reg.present ? t.present : t.absentBadge}
        </button>
      ) : (
        <span className={[
          'shrink-0 text-[0.65rem] font-semibold px-1.5 py-0.5 rounded border',
          reg.present
            ? 'text-[var(--color-success,#22c55e)] border-[var(--color-success,#22c55e)]/30 bg-[var(--color-success,#22c55e)]/10'
            : 'text-[var(--color-danger)] border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10',
        ].join(' ')}>
          {reg.present ? t.present : t.absentBadge}
        </span>
      )}

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
          {Object.entries(t.top3Labels).map(([val, lbl]) => (
            <option key={val} value={val}>{lbl}</option>
          ))}
        </select>
      ) : reg.top3Rank !== null ? (
        <span className="shrink-0 text-[0.65rem] font-semibold text-[var(--color-text-muted)]">
          {t.top3Labels[String(reg.top3Rank) as keyof typeof t.top3Labels]}
        </span>
      ) : null}

      {canEdit && (
        <button
          onClick={() => onRemove(reg)}
          disabled={isPending}
          className="shrink-0 w-5 h-5 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors disabled:opacity-40 text-sm"
          title={t.remove}
        >
          ×
        </button>
      )}
    </div>
  )
}
