import { z } from 'zod'
import { ok, created, fail } from '@/lib/apiResponse'
import { ValidationError } from '@/lib/errors'
import {
  API_RATE_LIMIT,
  buildRateLimitIdentifier,
  rateLimit,
  rateLimitResponse,
} from '@/lib/rateLimit'
import { requireAuth } from '@/server/security/authGuard'
import {
  getDsRegistrationsForWeek,
  removeDsRegistration,
  saveDsRegistration,
} from '@/server/services/desertStormService'

const upsertSchema = z.object({
  playerId: z.number().int().positive(),
  weekId: z.number().int().positive(),
  team: z.enum(['A', 'B']),
  role: z.enum(['titulaire', 'remplaçant']),
  present: z.boolean(),
  top3Rank: z.union([z.literal(1), z.literal(2), z.literal(3)]).nullable(),
})

const deleteSchema = z.object({
  playerId: z.number().int().positive(),
  weekId: z.number().int().positive(),
})

export async function GET(request: Request) {
  try {
    await requireAuth('dashboard:view')
    const { searchParams } = new URL(request.url)
    const weekId = Number(searchParams.get('weekId'))
    if (!weekId) throw new ValidationError('weekId is required')
    const registrations = await getDsRegistrationsForWeek(weekId)
    return ok(registrations)
  } catch (err) {
    return fail(err)
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAuth('scores:edit')
    const limit = await rateLimit(
      'desert-storm:upsert',
      buildRateLimitIdentifier(request, actor.id),
      API_RATE_LIMIT,
    )
    if (!limit.ok) {
      return rateLimitResponse(limit)
    }

    const body = await request.json()
    const input = upsertSchema.parse(body)
    const result = await saveDsRegistration(input)
    return created(result)
  } catch (err) {
    return fail(err)
  }
}

export async function DELETE(request: Request) {
  try {
    const actor = await requireAuth('scores:edit')
    const limit = await rateLimit(
      'desert-storm:delete',
      buildRateLimitIdentifier(request, actor.id),
      API_RATE_LIMIT,
    )
    if (!limit.ok) {
      return rateLimitResponse(limit)
    }

    const body = await request.json()
    const input = deleteSchema.parse(body)
    await removeDsRegistration(input.playerId, input.weekId)
    return ok({ deleted: true })
  } catch (err) {
    return fail(err)
  }
}
