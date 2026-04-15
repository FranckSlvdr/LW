'use client'

import { useState } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { useI18n } from '@/lib/i18n/client'
import type { TrainSettingsApi } from '@/types/api'

interface TrainSettingsPanelProps {
  settings: TrainSettingsApi
}

export function TrainSettingsPanel({ settings: initial }: TrainSettingsPanelProps) {
  const { dict }            = useI18n()
  const t                   = dict.trains
  const [s, setS]           = useState(initial)
  const [status, setStatus] = useState<'idle' | 'loading' | 'saved' | 'error'>('idle')

  async function handleSave() {
    setStatus('loading')
    try {
      const res = await fetch('/api/trains/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(s),
      })
      if (!res.ok) throw new Error('Erreur')
      const data = await res.json().catch(() => ({}))
      if (data?.data) setS(data.data)
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    } catch {
      setStatus('error')
    }
  }

  return (
    <Card>
      <CardHeader title={t.settingsTitle} subtitle={t.settingsSubtitle} />

      <div className="mt-4 space-y-5">

        {/* Exclusion window */}
        <div>
          <label className="label-xs block mb-2">{t.exclusionWindowLabel}</label>
          <div className="grid grid-cols-2 gap-1.5">
            {([0, 1, 2, 3] as const).map((n) => (
              <button
                key={n}
                onClick={() => setS((prev) => ({ ...prev, exclusionWindowWeeks: n }))}
                className={[
                  'px-3 py-2 rounded-lg text-xs font-medium border transition-colors',
                  s.exclusionWindowWeeks === n
                    ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]/40',
                ].join(' ')}
              >
                {n === 0 ? t.exclusionWindowNone : t.exclusionWindowN.replace('{n}', String(n))}
              </button>
            ))}
          </div>
        </div>

        {/* Total drivers */}
        <div>
          <label className="label-xs block mb-2">{t.driversPerDayLabel}</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setS((p) => ({ ...p, totalDriversPerDay: Math.max(1, p.totalDriversPerDay - 1) }))}
              className="w-8 h-8 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] transition-colors flex items-center justify-center font-bold"
            >
              −
            </button>
            <span className="text-xl font-bold text-[var(--color-text-primary)] w-6 text-center">
              {s.totalDriversPerDay}
            </span>
            <button
              onClick={() => setS((p) => ({ ...p, totalDriversPerDay: Math.min(10, p.totalDriversPerDay + 1) }))}
              className="w-8 h-8 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] transition-colors flex items-center justify-center font-bold"
            >
              +
            </button>
          </div>
        </div>

        {/* Reserved slots */}
        <div>
          <label className="label-xs block mb-2">{t.reservedSlotsLabel}</label>
          <div className="space-y-2">
            <Toggle
              label={t.dsTop2Label}
              checked={s.includeDsTop2}
              onChange={(v) => setS((p) => ({ ...p, includeDsTop2: v }))}
            />
            <Toggle
              label={t.bestContribLabel}
              checked={s.includeBestContributor}
              onChange={(v) => setS((p) => ({ ...p, includeBestContributor: v }))}
            />
          </div>
        </div>

        {/* VS filter — restrict eligible pool */}
        <div>
          <label className="label-xs block mb-2">{t.vsRestrictionLabel}</label>
          <p className="text-xs text-[var(--color-text-muted)] mb-2 leading-relaxed">
            {t.vsRestrictionHint}
          </p>
          <div className="space-y-3">
            {/* Count stepper — 0 = off, 1–50 */}
            <div>
              <p className="text-xs text-[var(--color-text-muted)] mb-1.5">{t.vsTopNLabel}</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setS((p) => ({ ...p, vsTopCount: Math.max(0, p.vsTopCount - 1) }))}
                  className="w-8 h-8 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] transition-colors flex items-center justify-center font-bold"
                >
                  −
                </button>
                <span className={`text-xl font-bold w-12 text-center ${s.vsTopCount === 0 ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-primary)]'}`}>
                  {s.vsTopCount === 0 ? 'OFF' : s.vsTopCount}
                </span>
                <button
                  onClick={() => setS((p) => ({ ...p, vsTopCount: Math.min(50, p.vsTopCount + 1) }))}
                  className="w-8 h-8 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] transition-colors flex items-center justify-center font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {/* Day selector — shown only when vsTopCount > 0 */}
            {s.vsTopCount > 0 && (
              <div>
                <p className="text-xs text-[var(--color-text-muted)] mb-1.5">
                  {t.vsDaysLabel}{' '}
                  <span className="opacity-60">{t.vsDaysHint}</span>
                </p>
                <div className="flex gap-1.5 flex-wrap">
                  {([1, 2, 3, 4, 5, 6] as const).map((day) => {
                    const label = t.daysShort[day - 1] ?? String(day)
                    const active = s.vsTopDays.includes(day)
                    return (
                      <button
                        key={day}
                        onClick={() =>
                          setS((p) => ({
                            ...p,
                            vsTopDays: active
                              ? p.vsTopDays.filter((d) => d !== day)
                              : [...p.vsTopDays, day].sort(),
                          }))
                        }
                        className={[
                          'px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                          active
                            ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                            : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]/40',
                        ].join(' ')}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={status === 'loading'}
          className="w-full py-2.5 text-sm font-semibold bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-40"
        >
          {status === 'loading' ? t.btnSaving
           : status === 'saved'   ? t.btnSaved
           : status === 'error'   ? t.btnSaveError
           : t.btnSave}
        </button>
      </div>
    </Card>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)]">
      <span className="text-sm text-[var(--color-text-primary)]">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={[
          'relative w-10 h-5 rounded-full transition-colors',
          checked ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-surface-raised)] border border-[var(--color-border)]',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0.5',
          ].join(' ')}
        />
      </button>
    </div>
  )
}
