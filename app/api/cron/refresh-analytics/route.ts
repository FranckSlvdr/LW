import { NextRequest } from 'next/server'
import { ok, fail } from '@/lib/apiResponse'
import { refreshStaleSnapshots } from '@/server/services/analyticsService'
import { logger } from '@/lib/logger'

// Allow up to 60s — refreshing many stale weeks runs sequentially to avoid
// saturating the DB connection pool, so it can take longer than the default 10s.
export const maxDuration = 60

/**
 * GET /api/cron/refresh-analytics
 *
 * Scheduled job — refreshes all week_kpi_snapshots marked as stale.
 * Triggered by Vercel Cron (see vercel.json).
 *
 * Security: protected by CRON_SECRET header. Vercel injects this automatically
 * when cron triggers the route. Set CRON_SECRET in Vercel environment variables.
 *
 * Returns: { refreshed: number, failed: number }
 */
export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
      const authHeader = request.headers.get('authorization')
      if (authHeader !== `Bearer ${cronSecret}`) {
        return new Response('Unauthorized', { status: 401 })
      }
    }

    logger.info('Cron: refresh-analytics triggered')
    const result = await refreshStaleSnapshots()
    logger.info('Cron: refresh-analytics done', result)

    return ok(result)
  } catch (err) {
    logger.error('Cron: refresh-analytics failed', { err: String(err) })
    return fail(err)
  }
}
