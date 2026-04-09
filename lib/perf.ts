/**
 * Lightweight dev-only server timing helper.
 *
 * Usage:
 *   const done = perf('kpiService.getDashboardData')
 *   await doWork()
 *   done()   // → [perf] kpiService.getDashboardData 142ms
 *
 * No-ops in production. Remove call sites when no longer needed.
 */
export function perf(label: string): () => void {
  if (process.env.NODE_ENV !== 'development') return noop
  const start = performance.now()
  return () =>
    console.log(`[perf] ${label} ${(performance.now() - start).toFixed(0)}ms`)
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {}
