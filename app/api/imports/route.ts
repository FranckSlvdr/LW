import { ok, created, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/server/security/authGuard'
import { getRecentImports, importPlayersFromCsv, importScoresFromCsv } from '@/server/services/importService'
import { importRequestSchema } from '@/server/validators/importValidator'
import { BadRequestError } from '@/lib/errors'
import { APP_CONFIG } from '@/config/app.config'

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
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const importType = formData.get('importType') as string | null
    await requireAuth(importType === 'players' ? 'players:import' : 'scores:import')
    const weekIdRaw = formData.get('weekId') as string | null

    if (!file) throw new BadRequestError('Fichier manquant')
    if (file.size > APP_CONFIG.maxImportFileSizeBytes) {
      throw new BadRequestError('Fichier trop volumineux (max 5 Mo)')
    }

    const { importType: type, weekId } = importRequestSchema.parse({
      importType,
      weekId: weekIdRaw ?? undefined,
    })

    const csvContent = await file.text()
    const filename = file.name

    if (type === 'players') {
      const result = await importPlayersFromCsv(csvContent, filename)
      return created(result)
    }

    if (!weekId) throw new BadRequestError('weekId requis pour un import de scores')
    const result = await importScoresFromCsv(csvContent, filename, weekId)
    return created(result)
  } catch (err) {
    return fail(err)
  }
}
