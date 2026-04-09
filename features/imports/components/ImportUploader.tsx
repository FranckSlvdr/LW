'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader } from '@/components/ui/Card'
import type { WeekApi } from '@/types/api'

interface ImportUploaderProps {
  weeks: WeekApi[]
}

export function ImportUploader({ weeks }: ImportUploaderProps) {
  const [importType, setImportType] = useState<'players' | 'scores'>('scores')
  const [weekId, setWeekId]         = useState<string>(String(weeks[0]?.id ?? ''))
  const [file, setFile]             = useState<File | null>(null)
  const [status, setStatus]         = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage]       = useState<string | null>(null)
  const fileRef                     = useRef<HTMLInputElement>(null)
  const router                      = useRouter()
  const [, startTransition]         = useTransition()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return

    setStatus('loading')
    setMessage(null)

    const form = new FormData()
    form.append('file', file)
    form.append('importType', importType)
    if (importType === 'scores' && weekId) form.append('weekId', weekId)

    try {
      const res  = await fetch('/api/imports', { method: 'POST', body: form })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error?.message ?? 'Erreur lors de l\'import')
      }

      const result = data.data
      setStatus('success')
      setMessage(`✅ ${result.rowsImported} lignes importées${result.rowsSkipped ? ` · ${result.rowsSkipped} ignorées` : ''}`)
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      startTransition(() => router.refresh())
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Erreur inconnue')
    }
  }

  return (
    <Card>
      <CardHeader title="Nouvel import CSV" subtitle="Importez des joueurs ou des scores depuis un fichier CSV" />

      <form onSubmit={handleSubmit} className="space-y-4 mt-2">
        {/* Type selector */}
        <div className="flex gap-3">
          {(['scores', 'players'] as const).map((t) => (
            <label
              key={t}
              className={[
                'flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors text-sm',
                importType === t
                  ? 'border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)]',
              ].join(' ')}
            >
              <input
                type="radio"
                name="importType"
                value={t}
                checked={importType === t}
                onChange={() => setImportType(t)}
                className="sr-only"
              />
              <span>{t === 'scores' ? '📊' : '👥'}</span>
              <span className="font-medium">{t === 'scores' ? 'Scores VS' : 'Joueurs'}</span>
            </label>
          ))}
        </div>

        {/* Week selector (scores only) */}
        {importType === 'scores' && (
          <div>
            <label className="label-xs block mb-1">Semaine</label>
            <select
              value={weekId}
              onChange={(e) => setWeekId(e.target.value)}
              className="w-full max-w-xs px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
            >
              {weeks.map((w) => (
                <option key={w.id} value={w.id}>{w.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Template download */}
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] w-fit">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-[var(--color-text-muted)] shrink-0">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
          </svg>
          <span className="text-xs text-[var(--color-text-muted)]">Modèle :</span>
          <a
            href={
              importType === 'players'
                ? '/templates/joueurs-template.csv'
                : '/templates/scores-vs-template.csv'
            }
            download
            className="text-xs font-medium text-[var(--color-accent)] hover:underline"
          >
            {importType === 'players' ? 'joueurs-template.csv' : 'scores-vs-template.csv'}
          </a>
        </div>

        {/* File picker */}
        <div>
          <label className="label-xs block mb-1">Fichier CSV</label>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block text-sm text-[var(--color-text-secondary)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[var(--color-accent)]/10 file:text-[var(--color-accent)] hover:file:bg-[var(--color-accent)]/20 cursor-pointer"
          />
        </div>

        {/* Submit */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={!file || status === 'loading'}
            className="px-5 py-2 text-sm bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-40"
          >
            {status === 'loading' ? 'Import en cours…' : 'Importer'}
          </button>
          {message && (
            <p className={`text-sm ${status === 'success' ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
              {message}
            </p>
          )}
        </div>
      </form>
    </Card>
  )
}
