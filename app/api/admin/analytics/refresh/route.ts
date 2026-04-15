import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/server/security/authGuard'
import { refreshWeekAnalytics } from '@/server/services/analyticsService'
import { BadRequestError } from '@/lib/errors'
import { z } from 'zod'

const schema = z.object({
  weekId: z.coerce.number().int().positive(),
})

/**
 * POST /api/admin/analytics/refresh
 * Body: { weekId: number }
 *
 * Force-recomputes and persists all analytics for a given week:
 *   - week_kpi_snapshots (JSONB fast-path cache)
 *   - week_member_stats  (structured per-player stats)
 *   - week_rank_stats    (per-rank-tier aggregates)
 *
 * Requires: scores:import permission (admin / super_admin only)
 */
export async function POST(request: Request) {
  try {
    await requireAuth('scores:import')

    const body = await request.json()
    const { weekId } = schema.parse(body)

    if (!weekId) throw new BadRequestError('weekId requis')

    await refreshWeekAnalytics(weekId)

    return ok({ weekId, refreshed: true })
  } catch (err) {
    return fail(err)
  }
}
