import 'server-only'
import { db } from '@/server/db/client'
import type { ImportRow_DB, ImportRowDetailRow } from '@/types/db'
import type { Import, ImportRow, ImportStatus, ImportType, ImportError } from '@/types/domain'

// ─── Mapping ──────────────────────────────────────────────────────────────────

function toImport(row: ImportRow_DB): Import {
  return {
    id: row.id,
    importType: row.import_type as ImportType,
    weekId: row.week_id,
    filename: row.filename,
    status: row.status as ImportStatus,
    rowsTotal: row.rows_total,
    rowsImported: row.rows_imported,
    rowsSkipped: row.rows_skipped,
    errorsJson: (row.errors_json as ImportError[]) ?? null,
    importedBy: row.imported_by,
    createdAt: row.created_at,
  }
}

function toImportRow(row: ImportRowDetailRow): ImportRow {
  return {
    id: row.id,
    importId: row.import_id,
    rowNumber: row.row_number,
    rawDataJson: row.raw_data_json as Record<string, unknown>,
    normalizedDataJson: (row.normalized_data_json as Record<string, unknown>) ?? null,
    status: row.status as ImportRow['status'],
    errorMessage: row.error_message,
    createdAt: row.created_at,
  }
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function findRecentImports(limit = 10): Promise<Import[]> {
  const rows = await db<ImportRow_DB[]>`
    SELECT * FROM imports
    ORDER BY created_at DESC
    LIMIT ${limit}
  `
  return rows.map(toImport)
}

export async function findImportById(id: number): Promise<Import | null> {
  const rows = await db<ImportRow_DB[]>`
    SELECT * FROM imports WHERE id = ${id} LIMIT 1
  `
  return rows[0] ? toImport(rows[0]) : null
}

export async function findImportRows(
  importId: number,
  status?: ImportRow['status'],
): Promise<ImportRow[]> {
  const rows = status
    ? await db<ImportRowDetailRow[]>`
        SELECT * FROM import_rows
        WHERE import_id = ${importId} AND status = ${status}
        ORDER BY row_number ASC
      `
    : await db<ImportRowDetailRow[]>`
        SELECT * FROM import_rows
        WHERE import_id = ${importId}
        ORDER BY row_number ASC
      `
  return rows.map(toImportRow)
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createImport(data: {
  importType: ImportType
  weekId?: number
  filename?: string
  importedBy?: string
}): Promise<Import> {
  const rows = await db<ImportRow_DB[]>`
    INSERT INTO imports (import_type, week_id, filename, imported_by)
    VALUES (
      ${data.importType},
      ${data.weekId ?? null},
      ${data.filename ?? null},
      ${data.importedBy ?? null}
    )
    RETURNING *
  `
  return toImport(rows[0])
}

export async function updateImportStatus(
  id: number,
  data: {
    status: ImportStatus
    rowsTotal: number
    rowsImported: number
    rowsSkipped: number
    errors?: ImportError[]
  },
): Promise<void> {
  await db`
    UPDATE imports SET
      status        = ${data.status},
      rows_total    = ${data.rowsTotal},
      rows_imported = ${data.rowsImported},
      rows_skipped  = ${data.rowsSkipped},
      errors_json   = ${data.errors ? db.json(data.errors as never) : null}
    WHERE id = ${id}
  `
}

/** Bulk insert row-level detail records for a given import */
export async function bulkInsertImportRows(
  rows: Array<{
    importId: number
    rowNumber: number
    rawDataJson: Record<string, unknown>
    normalizedDataJson?: Record<string, unknown>
    status: ImportRow['status']
    errorMessage?: string
  }>,
): Promise<void> {
  if (rows.length === 0) return

  const records = rows.map((r) => ({
    import_id: r.importId,
    row_number: r.rowNumber,
    raw_data_json: db.json(r.rawDataJson as never),
    normalized_data_json: r.normalizedDataJson ? db.json(r.normalizedDataJson as never) : null,
    status: r.status,
    error_message: r.errorMessage ?? null,
  }))

  await db`
    INSERT INTO import_rows
      ${db(records, 'import_id', 'row_number', 'raw_data_json', 'normalized_data_json', 'status', 'error_message')}
    ON CONFLICT (import_id, row_number) DO NOTHING
  `
}
