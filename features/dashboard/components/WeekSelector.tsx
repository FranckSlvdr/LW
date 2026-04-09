'use client'

import { useRouter } from 'next/navigation'
import type { WeekApi } from '@/types/api'

interface WeekSelectorProps {
  weeks: WeekApi[]
  selectedWeekId: number
}

export function WeekSelector({ weeks, selectedWeekId }: WeekSelectorProps) {
  const router = useRouter()

  return (
    <select
      value={selectedWeekId}
      onChange={(e) => router.push(`/dashboard?weekId=${e.target.value}`)}
      className="text-xs bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-lg px-3 py-1.5 cursor-pointer hover:border-[var(--color-accent)]/50 focus:border-[var(--color-accent)] focus:outline-none transition-colors"
    >
      {weeks.map((w) => (
        <option key={w.id} value={w.id}>
          {w.label}{w.isLocked ? ' 🔒' : ''}
        </option>
      ))}
    </select>
  )
}
