export const maxDuration = 60

import { ok, created, fail } from '@/lib/apiResponse'
import { BadRequestError } from '@/lib/errors'
import {
  HEAVY_API_RATE_LIMIT,
  buildRateLimitIdentifier,
  rateLimit,
  rateLimitResponse,
} from '@/lib/rateLimit'
import { APP_CONFIG } from '@/config/app.config'
import { requireAuth } from '@/server/security/authGuard'
import {
  getRecentImports,
  importPlayersFromCsv,
  importScoresFromCsv,
} from '@/server/services/importService'
import { importRequestSchema } from '@/server/validators/importValidator'

export async function GET() {
  try {
    await requireAuth('dashboard:view')
    const imports = await getRecentImports(10)
    return ok(imports)
  } catch (err) {
    return fail(err)
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAuth('scores:import')
    const limit = await rateLimit(
      'imports:upload',
      buildRateLimitIdentifier(request, actor.id),
      HEAVY_API_RATE_LIMIT,
    )
    if (!limit.ok) {
      return rateLimitResponse(limit, 'Trop d imports en peu de temps.')
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const importType = formData.get('importType') as string | null
    const weekIdRaw = formData.get('weekId') as string | null

    if (!file) throw new BadRequestError('Fichier manquant')
    if (file.size > APP_CONFIG.maxImportFileSizeBytes) {
      throw new BadRequestError('Fichier trop volumineux (max 5 Mo)')
    }

    const { importType: type, weekId } = importRequestSchema.parse({
      importType,
      weekId: weekIdRaw ?? undefined,
    })

    if (type === 'players') {
      await requireAuth('players:import')
    }

    const csvContent = await file.text()
    const filename = file.name

    if (type === 'players') {
      const result = await importPlayersFromCsv(csvContent, filename)
      return created(result)
    }

    if (!weekId) {
      throw new BadRequestError('weekId requis pour un import de scores')
    }

    const result = await importScoresFromCsv(csvContent, filename, weekId)
    return created(result)
  } catch (err) {
    return fail(err)
  }
}
