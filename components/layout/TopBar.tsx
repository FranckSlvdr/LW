import { Suspense } from 'react'
import type { WeekApi } from '@/types/api'
import { WeekSelector } from '@/features/dashboard/components/WeekSelector'

interface TopBarProps {
  weeks: WeekApi[]
  selectedWeekId: number
  /** Page title shown in the bar (default: "Dashboard") */
  title?: string
  /** Show week selector (default: true) */
  showWeekSelector?: boolean
}

export function TopBar({
  weeks,
  selectedWeekId,
  title = 'Dashboard',
  showWeekSelector = true,
}: TopBarProps) {
  return (
    <header className="h-14 shrink-0 flex items-center px-4 md:px-6 border-b border-[var(--color-border)] bg-[var(--color-surface)] sticky top-0 z-10">
      <div className="flex items-center gap-3 md:gap-4 min-w-0">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] truncate">{title}</h2>
        {showWeekSelector && weeks.length > 0 && (
          <Suspense fallback={null}>
            <WeekSelector weeks={weeks} selectedWeekId={selectedWeekId} />
          </Suspense>
        )}
      </div>
    </header>
  )
}
