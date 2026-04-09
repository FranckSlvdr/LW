import { SkeletonCard } from '@/components/ui/Skeleton'
import { Skeleton } from '@/components/ui/Skeleton'

/**
 * Affiché automatiquement par Next.js via Suspense pendant que
 * la dashboard page charge ses données côté serveur.
 */
export default function DashboardLoading() {
  return (
    <div className="flex-1 overflow-y-auto">
      {/* TopBar skeleton */}
      <div className="h-14 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-center px-6 gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-40 rounded-lg" />
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>

        {/* Top/Flop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonCard lines={6} />
          <SkeletonCard lines={6} />
        </div>

        {/* Heatmap */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-3">
          <Skeleton className="h-4 w-40" />
          <div className="space-y-2 pt-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-lg" />
            ))}
          </div>
        </div>

        {/* Insights + imports */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonCard lines={5} />
          <SkeletonCard lines={5} />
        </div>

        {/* Ranking */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-3">
          <Skeleton className="h-4 w-36" />
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>

      </div>
    </div>
  )
}
