import { NextRequest } from 'next/server'
import { ok, fail } from '@/lib/apiResponse'
import { refreshAllianceStats } from '@/server/services/allianceStatsService'
import { getCronSecret } from '@/server/config/cron'
import { logger } from '@/lib/logger'

export const maxDuration = 60
const CRON_SECRET = getCronSecret()

/**
 * GET /api/cron/compute-alliance-stats
 *
 * Scheduled job — computes cross-week alliance KPI stats and stores them in
 * stats_cache so the /kpi page serves pre-computed data instantly.
 *
 * Schedule: daily at 04:00 UTC (see vercel.json).
 * Security: protected by CRON_SECRET header (auto-injected by Vercel Cron).
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 })
    }

    logger.info('Cron: compute-alliance-stats triggered')
    const result = await refreshAllianceStats()
    logger.info('Cron: compute-alliance-stats done', result)

    return ok(result)
  } catch (err) {
    logger.error('Cron: compute-alliance-stats failed', { err: String(err) })
    return fail(err)
  }
}
