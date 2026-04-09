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
    <header className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-[var(--color-border)] bg-[var(--color-surface)] sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h2>
        {showWeekSelector && weeks.length > 0 && (
          <WeekSelector weeks={weeks} selectedWeekId={selectedWeekId} />
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.65rem] font-semibold bg-[var(--color-success-dim)] text-[var(--color-success)] border border-[var(--color-success)]/20">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] animate-pulse-dot" />
          Demo
        </span>
      </div>
    </header>
  )
}
