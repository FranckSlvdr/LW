'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { WeekApi } from '@/types/api'

interface WeekSelectorProps {
  weeks: WeekApi[]
  selectedWeekId: number
}

export function WeekSelector({ weeks, selectedWeekId }: WeekSelectorProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const selectedWeek = weeks.find((week) => week.id === selectedWeekId) ?? null

  function handleChange(nextWeekId: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('weekId', nextWeekId)
    router.push(`${pathname}?${params.toString()}`)
  }

  const statusLabel = selectedWeek?.isLocked ? 'Verrouillee' : 'Active'
  const statusClasses = selectedWeek?.isLocked
    ? 'bg-[var(--color-text-muted)]/10 text-[var(--color-text-muted)] border-[var(--color-border)]'
    : 'bg-[var(--color-success-dim)] text-[var(--color-success)] border-[var(--color-success)]/20'

  return (
    <div className="flex items-center gap-2">
      <select
        value={selectedWeekId}
        onChange={(e) => handleChange(e.target.value)}
        className="text-xs bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-lg px-3 py-1.5 cursor-pointer hover:border-[var(--color-accent)]/50 focus:border-[var(--color-accent)] focus:outline-none transition-colors"
      >
        {weeks.map((week, index) => {
          const state = week.isLocked ? 'verrouillee' : index === 0 ? 'active' : 'ouverte'
          return (
            <option key={week.id} value={week.id}>
              {week.label} · {state}
            </option>
          )
        })}
      </select>
      {selectedWeek && (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-[0.65rem] font-semibold border ${statusClasses}`}>
          {statusLabel}
        </span>
      )}
    </div>
  )
}
