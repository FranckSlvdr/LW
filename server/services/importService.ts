import 'server-only'
import { unstable_cache, revalidateTag } from 'next/cache'
import { IS_VERCEL_RUNTIME, USE_NEXT_DATA_CACHE } from '@/server/config/runtime'
import { processPlayerImport, processScoreImport } from '@/server/engines/importProcessor'
import {
  createImport,
  updateImportStatus,
  bulkInsertImportRows,
  findRecentImports,
} from '@/server/repositories/importRepository'
import { bulkInsertPlayers, findPlayerNameMap } from '@/server/repositories/playerRepository'
import { bulkUpsertProfessions } from '@/server/repositories/professionRepository'
import { upsertScoresBulk } from '@/server/repositories/scoreRepository'
import { findWeekById } from '@/server/repositories/weekRepository'
import { invalidatePlayersCache } from '@/server/services/playerService'
import { invalidateWeekKpi, invalidateAllKpis } from '@/server/services/analyticsService'
import { NotFoundError, UnprocessableError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { APP_CONFIG } from '@/config/app.config'
import type { ImportResult } from '@/types/api'
import type { Import } from '@/types/domain'

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getRecentImports(limit = 5): Promise<Import[]> {
  const imports = IS_VERCEL_RUNTIME || USE_NEXT_DATA_CACHE
    ? await getRecentImportsCached(limit)()
    : await readRecentImports(limit)
  return imports.map((imp) => ({ ...imp, createdAt: new Date(imp.createdAt) }))
}

async function readRecentImports(limit: number): Promise<Import[]> {
  return findRecentImports(limit)
}

function getRecentImportsCached(limit: number) {
  return unstable_cache(
    () => readRecentImports(limit),
    ['recent-imports', String(limit)],
    { revalidate: 30, tags: ['imports'] },
  )
}

// ─── Player import ────────────────────────────────────────────────────────────

export async function importPlayersFromCsv(
  csvContent: string,
  filename: string,
  importedBy?: string,
): Promise<ImportResult> {
  if (csvContent.length > APP_CONFIG.maxImportFileSizeBytes) {
    throw new UnprocessableError('Fichier trop volumineux (max 5 Mo)')
  }

  const importRecord = await createImport({
    importType: 'players',
    filename,
    importedBy,
  })

  try {
    const result = processPlayerImport(csvContent)

    // Persist row-level detail
    await bulkInsertImportRows([
      ...result.valid.map((r) => ({
        importId: importRecord.id,
        rowNumber: r.rowNumber,
        rawDataJson: r.raw,
        normalizedDataJson: r.normalized as unknown as Record<string, unknown>,
        status: 'imported' as const,
      })),
      ...result.skipped.map((r) => ({
        importId: importRecord.id,
        rowNumber: r.rowNumber,
        rawDataJson: r.raw,
        status: 'skipped' as const,
        errorMessage: r.reason,
      })),
      ...result.errors.map((r) => ({
        importId: importRecord.id,
        rowNumber: r.rowNumber,
        rawDataJson: r.raw,
        status: 'error' as const,
        errorMessage: r.error.message,
      })),
    ])

    // Insert valid players
    let inserted = 0
    if (result.valid.length > 0) {
      const { count, nameMap } = await bulkInsertPlayers(result.valid.map((r) => r.normalized))
      inserted = count

      // Upsert professions for players that provided profession data
      const professionEntries = result.valid
        .filter((r) => r.normalized.professionKey !== null || r.normalized.professionLevel !== null)
        .map((r) => {
          const playerId = nameMap.get(r.normalized.normalizedName)
          if (!playerId) return null
          return {
            playerId,
            professionKey:   r.normalized.professionKey ?? null,
            professionLevel: r.normalized.professionLevel ?? null,
          }
        })
        .filter((e): e is NonNullable<typeof e> => e !== null)

      if (professionEntries.length > 0) {
        await bulkUpsertProfessions(professionEntries)
      }
    }

    const status = result.errors.length > 0 ? 'partial' : 'success'
    await updateImportStatus(importRecord.id, {
      status,
      rowsTotal: result.summary.total,
      rowsImported: inserted,
      rowsSkipped: result.summary.skipped,
      errors: result.errors.map((e) => e.error),
    })

    if (inserted > 0) {
      invalidatePlayersCache()
      invalidateAllKpis() // player roster change affects all week snapshots
    }
    try {
      revalidateTag('imports', 'max')
    } catch {}

    logger.info('Player import completed', {
      importId: importRecord.id,
      ...result.summary,
      inserted,
    })

    return {
      importId: importRecord.id,
      status,
      rowsImported: inserted,
      rowsSkipped: result.summary.skipped,
      errors: result.errors.map((e) => e.error),
    }
  } catch (err) {
    await updateImportStatus(importRecord.id, {
      status: 'error',
      rowsTotal: 0,
      rowsImported: 0,
      rowsSkipped: 0,
    })
    throw err
  }
}

// ─── Score import ─────────────────────────────────────────────────────────────

export async function importScoresFromCsv(
  csvContent: string,
  filename: string,
  weekId: number,
  importedBy?: string,
): Promise<ImportResult> {
  const week = await findWeekById(weekId)
  if (!week) throw new NotFoundError('Week', weekId)
  if (week.isLocked) throw new UnprocessableError('Cette semaine est verrouillée')

  const importRecord = await createImport({
    importType: 'scores',
    weekId,
    filename,
    importedBy,
  })

  try {
    const result = processScoreImport(csvContent)

    // Resolve player names → ids using a single Map lookup
    const playerNameMap = await findPlayerNameMap()
    const resolvedScores: Array<{ playerId: number; dayOfWeek: number; score: number }> = []
    const unresolvedErrors: typeof result.errors = []

    for (const row of result.valid) {
      const playerId = playerNameMap.get(row.normalized.normalizedPlayerName)
      if (!playerId) {
        unresolvedErrors.push({
          rowNumber: row.rowNumber,
          raw: row.raw,
          error: {
            row: row.rowNumber,
            field: 'player_name',
            message: `Joueur inconnu : "${row.normalized.playerName}"`,
          },
        })
      } else {
        resolvedScores.push({
          playerId,
          dayOfWeek: row.normalized.dayOfWeek,
          score: row.normalized.score,
        })
      }
    }

    const unresolvedByRowNumber = new Map(
      unresolvedErrors.map((entry) => [entry.rowNumber, entry.error.message]),
    )

    await bulkInsertImportRows([
      ...result.valid.map((r) => ({
        importId: importRecord.id,
        rowNumber: r.rowNumber,
        rawDataJson: r.raw,
        normalizedDataJson: r.normalized as unknown as Record<string, unknown>,
        status: unresolvedByRowNumber.has(r.rowNumber)
          ? ('error' as const)
          : ('imported' as const),
        errorMessage: unresolvedByRowNumber.get(r.rowNumber),
      })),
      ...result.skipped.map((r) => ({
        importId: importRecord.id,
        rowNumber: r.rowNumber,
        rawDataJson: r.raw,
        status: 'skipped' as const,
        errorMessage: r.reason,
      })),
    ])

    const imported = resolvedScores.length > 0
      ? await upsertScoresBulk(
          { weekId, scores: resolvedScores as Parameters<typeof upsertScoresBulk>[0]['scores'] },
          'csv',
        )
      : 0

    const allErrors = [...result.errors, ...unresolvedErrors]
    const status = allErrors.length > 0 ? 'partial' : 'success'

    await updateImportStatus(importRecord.id, {
      status,
      rowsTotal: result.summary.total,
      rowsImported: imported,
      rowsSkipped: result.summary.skipped + unresolvedErrors.length,
      errors: allErrors.map((e) => e.error),
    })

    if (imported > 0) invalidateWeekKpi(weekId)
    try {
      revalidateTag('imports', 'max')
    } catch {}

    return {
      importId: importRecord.id,
      status,
      rowsImported: imported,
      rowsSkipped: result.summary.skipped + unresolvedErrors.length,
      errors: allErrors.map((e) => e.error),
    }
  } catch (err) {
    await updateImportStatus(importRecord.id, {
      status: 'error',
      rowsTotal: 0,
      rowsImported: 0,
      rowsSkipped: 0,
    })
    throw err
  }
}
