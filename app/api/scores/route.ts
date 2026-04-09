import type { NextRequest } from 'next/server'
import { requireAuth } from '@/server/security/authGuard'
import { ok, created, fail } from '@/lib/apiResponse'
import { getScoresByWeek, upsertBulkScores } from '@/server/services/scoreService'
import { BadRequestError } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    await requireAuth('dashboard:view')
    const weekIdParam = request.nextUrl.searchParams.get('weekId')
    if (!weekIdParam) throw new BadRequestError('weekId query param is required')
    const weekId = Number(weekIdParam)
    if (!Number.isInteger(weekId) || weekId <= 0) {
      throw new BadRequestError('weekId must be a positive integer')
    }
    const scores = await getScoresByWeek(weekId)
    return ok(scores)
  } catch (err) {
    return fail(err)
  }
}

export async function POST(request: Request) {
  try {
    await requireAuth('scores:import')
    const body = await request.json()
    const count = await upsertBulkScores(body)
    return created({ count })
  } catch (err) {
    return fail(err)
  }
}
