import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton'

/**
 * Generic page loading skeleton — used by all (dashboard) routes.
 * Matches the TopBar + content-area layout common to every page.
 */
export function PageLoading() {
  return (
    <div className="flex-1 overflow-y-auto">
      {/* TopBar skeleton */}
      <div className="h-14 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-center px-6 gap-4">
        <Skeleton className="h-4 w-32" />
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-4">
        <SkeletonCard lines={6} />
        <SkeletonCard lines={6} />
        <SkeletonCard lines={4} />
      </div>
    </div>
  )
}
