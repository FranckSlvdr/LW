import { ok, created, fail } from '@/lib/apiResponse'
import {
  API_RATE_LIMIT,
  buildRateLimitIdentifier,
  rateLimit,
  rateLimitResponse,
} from '@/lib/rateLimit'
import { requireAuth } from '@/server/security/authGuard'
import { refreshWeekAnalytics } from '@/server/services/analyticsService'
import { scheduleSingletonAfter } from '@/server/lib/scheduleSingletonAfter'
import { createNewWeek, getAllWeeks } from '@/server/services/weekService'

export async function GET() {
  try {
    await requireAuth('dashboard:view')
    const weeks = await getAllWeeks()
    return ok(weeks)
  } catch (err) {
    return fail(err)
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAuth('weeks:manage')
    const limit = await rateLimit(
      'weeks:create',
      buildRateLimitIdentifier(request, actor.id),
      API_RATE_LIMIT,
    )
    if (!limit.ok) {
      return rateLimitResponse(limit)
    }

    const body = await request.json()
    const week = await createNewWeek(body)

    // Pre-seed the analytics snapshot so the first visit to /vs is instant
    // instead of triggering a cold 7-query computation on page load.
    scheduleSingletonAfter(
      `analytics-seed:${week.id}`,
      () => refreshWeekAnalytics(week.id),
      { source: 'week-create', weekId: week.id },
    )

    return created(week)
  } catch (err) {
    return fail(err)
  }
}
