import type { NextRequest } from 'next/server'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/server/security/authGuard'
import { getDashboardData } from '@/server/services/kpiService'
import { getAllWeeks, getLatestWeek } from '@/server/services/weekService'
import { BadRequestError, NotFoundError } from '@/lib/errors'

// KPI reads can hit the cold path (snapshot miss + full recomputation).
export const maxDuration = 60

export async function GET(request: NextRequest) {
  try {
    await requireAuth('dashboard:view')
    const weekIdParam = request.nextUrl.searchParams.get('weekId')

    let weekId: number
    if (weekIdParam) {
      weekId = Number(weekIdParam)
      if (!Number.isInteger(weekId) || weekId <= 0) {
        throw new BadRequestError('weekId must be a positive integer')
      }
    } else {
      const latest = await getLatestWeek()
      if (!latest) throw new NotFoundError('No weeks found')
      weekId = latest.id
    }

    const [data, weeks] = await Promise.all([
      getDashboardData(weekId),
      getAllWeeks(),
    ])

    return ok({ ...data, weeks })
  } catch (err) {
    return fail(err)
  }
}
