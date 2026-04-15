/**
 * Excel export utility.
 * Loaded dynamically so the heavier Excel implementation only hits the client on demand.
 */

export type ExcelRow = Record<string, string | number | boolean | null | undefined>

export async function downloadExcel(
  rows: ExcelRow[],
  filename: string,
  sheetName = 'Export',
): Promise<void> {
  const ExcelJS = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(sheetName)
  const columns = Object.keys(rows[0] ?? {})

  worksheet.columns = columns.map((key) => ({
    header: key,
    key,
    width: Math.max(
      key.length,
      ...rows.map((row) => String(row[key] ?? '').length),
      10,
    ) + 2,
  }))

  rows.forEach((row) => {
    const normalized = Object.fromEntries(
      columns.map((key) => [key, row[key] ?? '']),
    )
    worksheet.addRow(normalized)
  })

  const header = worksheet.getRow(1)
  header.font = { bold: true }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob(
    [buffer],
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  )
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${filename}.xlsx`
  anchor.click()
  URL.revokeObjectURL(url)
}
