'use client'

import { useState } from 'react'
import type { ExcelRow } from '@/lib/excel'

interface ExportButtonProps {
  rows: ExcelRow[]
  filename: string
  sheetName?: string
  label?: string
}

export function ExportButton({ rows, filename, sheetName, label = 'Export' }: ExportButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    if (rows.length === 0 || loading) return
    setLoading(true)
    try {
      const { downloadExcel } = await import('@/lib/excel')
      await downloadExcel(rows, filename, sheetName)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading || rows.length === 0}
      title={rows.length === 0 ? 'Aucune donnée à exporter' : `Exporter en Excel (${rows.length} lignes)`}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {loading ? (
        <span className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
      )}
      {label}
    </button>
  )
}
