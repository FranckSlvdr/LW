'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader } from '@/components/ui/Card'
import { formatScoreCompact, formatScore } from '@/lib/utils'
import { interpolate } from '@/lib/i18n/utils'
import { APP_CONFIG } from '@/config/app.config'
import type { PlayerKpi } from '@/types/api'
import type { DayOfWeek } from '@/types/domain'
import type { Dictionary } from '@/lib/i18n/types'

interface ScoreHeatmapProps {
  kpis:     PlayerKpi[]
  dict:     Dictionary['heatmap']
  weekId:   number
  canEdit?: boolean
}

function heatColors(ratio: number, isEco: boolean): { bg: string; fg: string; border?: string } {
  if (isEco) {
    const a = 0.12 + ratio * 0.35
    return {
      bg:     `rgba(245, 158, 11, ${a})`,
      fg:     ratio > 0.45 ? 'rgba(245,158,11,1)' : 'rgba(245,158,11,0.8)',
      border: 'rgba(245, 158, 11, 0.3)',
    }
  }
  if (ratio < 0.15) return { bg: 'rgba(79,121,255,0.08)', fg: 'rgba(79,121,255,0.6)' }
  if (ratio < 0.35) return { bg: 'rgba(79,121,255,0.22)', fg: 'rgba(79,121,255,0.9)' }
  if (ratio < 0.55) return { bg: 'rgba(79,121,255,0.42)', fg: 'rgba(255,255,255,0.85)' }
  if (ratio < 0.75) return { bg: 'rgba(79,121,255,0.62)', fg: 'rgba(255,255,255,0.95)' }
  return               { bg: 'rgba(79,121,255,0.85)', fg: 'rgba(255,255,255,1)' }
}

function getEcoDaySet(kpis: PlayerKpi[]): Set<DayOfWeek> {
  const set   = new Set<DayOfWeek>()
  const first = kpis[0]
  if (!first) return set
  for (const d of first.dailyScores) {
    if (d.isEco) set.add(d.dayOfWeek)
  }
  return set
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ScoreHeatmap({ kpis, dict, weekId, canEdit = false }: ScoreHeatmapProps) {
  const router                              = useRouter()
  const [, startTransition]                 = useTransition()
  const refreshTimerRef                     = useRef<ReturnType<typeof setTimeout> | null>(null)
  // key `${playerId}:${day}` → overridden score after an inline save
  const [localScores, setLocalScores]       = useState<Map<string, number>>(new Map())
  // which cell is being edited
  const [editingCell, setEditingCell]       = useState<{ playerId: number; day: number } | null>(null)
  const [editValue, setEditValue]           = useState('')
  // key of cell currently being saved
  const [savingKey, setSavingKey]           = useState<string | null>(null)
  // key of cell that had a save error
  const [errorKey, setErrorKey]             = useState<string | null>(null)

  if (kpis.length === 0) return null

  const ecoDays   = getEcoDaySet(kpis)
  const allScores = kpis.flatMap((k) =>
    k.dailyScores.map((d) => localScores.get(`${k.playerId}:${d.dayOfWeek}`) ?? d.adjustedScore),
  )
  const maxScore = Math.max(...allScores, 1)
  const sorted   = [...kpis].sort((a, b) => b.totalScore - a.totalScore)

  function startEdit(playerId: number, day: number, currentRaw: number) {
    if (!canEdit) return
    setEditingCell({ playerId, day })
    setEditValue(currentRaw > 0 ? String(currentRaw) : '')
    setErrorKey(null)
  }

  function cancelEdit() {
    setEditingCell(null)
    setEditValue('')
  }

  async function confirmEdit(playerId: number, day: number, raw: string) {
    const parsed = Number(raw.trim())
    if (raw.trim() === '' || isNaN(parsed) || parsed < 0) {
      cancelEdit()
      return
    }

    const key = `${playerId}:${day}`
    setEditingCell(null)
    setEditValue('')
    setSavingKey(key)
    setErrorKey(null)

    try {
      const res = await fetch('/api/scores', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          weekId,
          scores: [{ playerId, dayOfWeek: day, score: parsed }],
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error?.message ?? `Erreur ${res.status}`)
      }
      // Mise à jour locale optimiste
      setLocalScores((prev) => new Map(prev).set(key, parsed))
      // Recharge les KPIs en arrière-plan — debounced pour éviter un after() par cellule sauvegardée
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = setTimeout(() => {
        startTransition(() => router.refresh())
      }, 3000)
    } catch {
      setErrorKey(key)
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <Card padding="none">
      <div className="p-5 pb-3">
        <CardHeader
          title={dict.title}
          subtitle={canEdit ? `${dict.subtitle} — cliquez sur un score pour le modifier` : dict.subtitle}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-raised)]/40">
              <th className="px-5 py-2.5 text-left text-[var(--color-text-muted)] font-medium w-40">
                {dict.colPlayer}
              </th>
              {dict.days.map((d, i) => {
                const day   = (i + 1) as DayOfWeek
                const isEco = ecoDays.has(day)
                return (
                  <th key={d} className="px-2 py-2.5 text-center font-semibold w-16 tracking-wide">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className={isEco ? 'text-amber-400' : 'text-[var(--color-text-muted)]'}>
                        {d}
                      </span>
                      {isEco && (
                        <span className="text-[0.5rem] font-bold uppercase tracking-wide text-amber-400 bg-amber-500/15 px-1 rounded">
                          ÉCO
                        </span>
                      )}
                    </div>
                  </th>
                )
              })}
              <th className="px-5 py-2.5 text-right text-[var(--color-text-muted)] font-medium w-24">
                {dict.colTotal}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((kpi, idx) => (
              <tr
                key={kpi.playerId}
                className={[
                  'border-b border-[var(--color-border-subtle)] transition-colors group',
                  'hover:bg-[var(--color-surface-raised)]/60',
                  idx % 2 !== 0 ? 'bg-[var(--color-surface-raised)]/20' : '',
                ].join(' ')}
              >
                <td className="px-5 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--color-text-muted)] text-[0.6rem] w-4 text-right shrink-0 tabular-nums">
                      {kpi.rank}
                    </span>
                    <span className="font-medium text-[var(--color-text-primary)] truncate max-w-[110px]">
                      {kpi.playerName}
                    </span>
                    {kpi.ecoDays > 0 && (
                      <span className="text-[var(--color-warning)] text-[0.55rem] opacity-70 shrink-0">
                        {dict.eco}
                      </span>
                    )}
                  </div>
                </td>

                {kpi.dailyScores.map((dayData) => {
                  const key         = `${kpi.playerId}:${dayData.dayOfWeek}`
                  const displayRaw  = localScores.get(key) ?? dayData.score
                  const displayAdj  = (ecoDays.has(dayData.dayOfWeek) && displayRaw > APP_CONFIG.ecoScoreCap)
                    ? APP_CONFIG.ecoScoreCap
                    : displayRaw
                  const isEditing   = editingCell?.playerId === kpi.playerId && editingCell?.day === dayData.dayOfWeek
                  const isSaving    = savingKey === key
                  const hasError    = errorKey === key

                  return (
                    <td key={dayData.dayOfWeek} className="px-2 py-1.5">
                      {isEditing ? (
                        <EditCell
                          value={editValue}
                          isEco={ecoDays.has(dayData.dayOfWeek)}
                          onChange={setEditValue}
                          onConfirm={(v) => confirmEdit(kpi.playerId, dayData.dayOfWeek, v)}
                          onCancel={cancelEdit}
                        />
                      ) : (
                        <HeatCell
                          rawScore={displayRaw}
                          adjustedScore={displayAdj}
                          max={maxScore}
                          isEco={dayData.isEco}
                          isEdited={localScores.has(key)}
                          isSaving={isSaving}
                          hasError={hasError}
                          canEdit={canEdit}
                          playerName={kpi.playerName}
                          day={dict.days[dayData.dayOfWeek - 1] ?? ''}
                          dict={dict}
                          onClick={() => startEdit(kpi.playerId, dayData.dayOfWeek, dayData.score)}
                        />
                      )}
                    </td>
                  )
                })}

                <td className="px-5 py-2 text-right tabular-nums">
                  {kpi.daysPlayed === 0 ? (
                    <span className="text-[var(--color-text-muted)]">—</span>
                  ) : (
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="font-bold text-[var(--color-text-primary)]">
                        {formatScoreCompact(kpi.totalScore)}
                      </span>
                      {kpi.rawTotalScore > kpi.totalScore && (
                        <span className="text-[0.55rem] text-[var(--color-text-muted)] tabular-nums">
                          brut {formatScoreCompact(kpi.rawTotalScore)}
                        </span>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="px-5 py-3 border-t border-[var(--color-border)] flex flex-wrap items-center gap-4 text-[0.65rem] text-[var(--color-text-muted)]">
        <LegendItem color="var(--color-surface-raised)" label={dict.legendAbsent} />
        <LegendItem color="rgba(245,158,11,0.35)" label={dict.legendEco} border="rgba(245,158,11,0.3)" />
        <div className="flex items-center gap-1.5">
          <div
            className="w-20 h-3 rounded-sm"
            style={{ background: 'linear-gradient(to right, rgba(79,121,255,0.08), rgba(79,121,255,0.85))' }}
          />
          <span>{dict.legendRange}</span>
        </div>
        {canEdit && (
          <span className="ml-auto text-[var(--color-text-muted)] opacity-60">
            ✏️ Cliquez sur une cellule pour modifier
          </span>
        )}
      </div>
    </Card>
  )
}

// ─── EditCell ─────────────────────────────────────────────────────────────────

interface EditCellProps {
  value:     string
  isEco:     boolean
  onChange:  (v: string) => void
  onConfirm: (v: string) => void
  onCancel:  () => void
}

function EditCell({ value, isEco, onChange, onConfirm, onCancel }: EditCellProps) {
  const confirmed = useRef(false)

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      confirmed.current = true
      onConfirm(e.currentTarget.value)
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      confirmed.current = true
      onCancel()
    }
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    if (!confirmed.current) {
      onConfirm(e.target.value)
    }
    confirmed.current = false
  }

  return (
    <input
      autoFocus
      type="number"
      min={0}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className={[
        'w-12 h-7 rounded mx-auto block text-center text-[0.55rem] tabular-nums',
        'bg-[var(--color-surface)] focus:outline-none px-0.5',
        isEco
          ? 'border border-amber-500 text-amber-400'
          : 'border border-[var(--color-accent)] text-[var(--color-text-primary)]',
      ].join(' ')}
    />
  )
}

// ─── HeatCell ─────────────────────────────────────────────────────────────────

interface HeatCellProps {
  rawScore:      number
  adjustedScore: number
  max:           number
  isEco:         boolean
  isEdited:      boolean
  isSaving:      boolean
  hasError:      boolean
  canEdit:       boolean
  playerName:    string
  day:           string
  dict:          Dictionary['heatmap']
  onClick:       () => void
}

function HeatCell({
  rawScore, adjustedScore, max, isEco,
  isEdited, isSaving, hasError, canEdit,
  playerName, day, dict, onClick,
}: HeatCellProps) {
  const interactiveClass = canEdit
    ? 'cursor-pointer hover:scale-110 hover:ring-1 hover:ring-[var(--color-accent)]/50'
    : 'cursor-default hover:scale-110'

  if (isSaving) {
    return (
      <div className="w-12 h-7 rounded mx-auto flex items-center justify-center opacity-50"
        style={{ background: 'rgba(79,121,255,0.2)' }}>
        <span className="text-[0.45rem] text-[var(--color-text-muted)]">…</span>
      </div>
    )
  }

  if (hasError) {
    return (
      <div
        onClick={onClick}
        className={`w-12 h-7 rounded mx-auto flex items-center justify-center cursor-pointer ring-1 ring-[var(--color-danger)]`}
        style={{ background: 'rgba(239,68,68,0.15)' }}
        title="Erreur — cliquer pour réessayer"
      >
        <span className="text-[0.5rem] text-[var(--color-danger)]">!</span>
      </div>
    )
  }

  if (rawScore === 0) {
    return (
      <div
        onClick={canEdit ? onClick : undefined}
        className={[
          'w-12 h-7 rounded mx-auto flex items-center justify-center transition-transform has-tooltip',
          canEdit ? 'cursor-pointer hover:scale-110 hover:ring-1 hover:ring-[var(--color-accent)]/40' : 'cursor-default',
        ].join(' ')}
        style={{ background: 'rgba(22,22,42,0.5)' }}
        data-tooltip={interpolate(dict.tooltipAbsent, { player: playerName, day, absentWord: dict.absent })}
      >
        <span className="text-[var(--color-text-muted)] text-[0.5rem]">—</span>
      </div>
    )
  }

  const ratio   = Math.max(0.05, adjustedScore / max)
  const colors  = heatColors(ratio, isEco)
  const wasCapped = isEco && rawScore > APP_CONFIG.ecoScoreCap

  const tooltip = wasCapped
    ? interpolate(dict.tooltipScoreEcoCapped, {
        player: playerName, day,
        score: formatScore(rawScore), adjusted: formatScore(adjustedScore), ecoWord: dict.eco,
      })
    : isEco
    ? interpolate(dict.tooltipScoreEco,   { player: playerName, day, score: formatScore(rawScore), ecoWord: dict.eco })
    : interpolate(dict.tooltipScore,      { player: playerName, day, score: formatScore(rawScore) })

  return (
    <div
      onClick={canEdit ? onClick : undefined}
      className={[
        'w-12 h-7 rounded mx-auto flex items-center justify-center has-tooltip transition-transform relative',
        interactiveClass,
      ].join(' ')}
      style={{
        background: colors.bg,
        border: colors.border ? `1px solid ${colors.border}` : undefined,
      }}
      title={canEdit ? 'Cliquer pour modifier' : undefined}
      data-tooltip={canEdit ? `${tooltip} — cliquer pour modifier` : tooltip}
    >
      <span className="text-[0.55rem] font-semibold tabular-nums" style={{ color: colors.fg }}>
        {formatScoreCompact(adjustedScore)}
      </span>
      {wasCapped && (
        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" title="Plafonné" />
      )}
      {isEdited && !wasCapped && (
        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" title="Modifié" />
      )}
    </div>
  )
}

function LegendItem({ color, label, border }: { color: string; label: string; border?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="w-3 h-3 rounded-sm"
        style={{ background: color, border: border ? `1px solid ${border}` : undefined }}
      />
      <span>{label}</span>
    </div>
  )
}
