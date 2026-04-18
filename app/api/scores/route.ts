import type { NextRequest } from 'next/server'
import { ok, created, fail } from '@/lib/apiResponse'
import { BadRequestError } from '@/lib/errors'
import {
  SCORE_EDIT_RATE_LIMIT,
  buildRateLimitIdentifier,
  rateLimit,
  rateLimitResponse,
} from '@/lib/rateLimit'
import { requireAuth } from '@/server/security/authGuard'
import { getScoresByWeek, upsertBulkScores } from '@/server/services/scoreService'

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
    const actor = await requireAuth('scores:import')
    const limit = await rateLimit(
      'scores:bulk-upsert',
      buildRateLimitIdentifier(request, actor.id),
      SCORE_EDIT_RATE_LIMIT,
    )
    if (!limit.ok) {
      return rateLimitResponse(limit, 'Trop de modifications de scores en peu de temps.')
    }

    const body = await request.json()
    const count = await upsertBulkScores(body)
    return created({ count })
  } catch (err) {
    return fail(err)
  }
}
