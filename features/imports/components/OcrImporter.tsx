'use client'

import { useState } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { OcrValidationTable } from './OcrValidationTable'
import { useI18n } from '@/lib/i18n/client'
import type { WeekApi } from '@/types/api'
import type { OcrParseResultApi } from '@/types/api'

interface OcrImporterProps {
  weeks: WeekApi[]
}

type Step = 'input' | 'validating' | 'review' | 'done' | 'error'

export function OcrImporter({ weeks }: OcrImporterProps) {
  const { dict, locale }          = useI18n()
  const t                         = dict.ocr
  const tTrains                   = dict.trains
  const isFrench                  = locale === 'fr'
  const [step, setStep]           = useState<Step>('input')
  const [text, setText]           = useState('')
  const [weekId, setWeekId]       = useState<string>(String(weeks[0]?.id ?? ''))
  const [dayOfWeek, setDayOfWeek] = useState<number>(1)
  const [result, setResult]       = useState<OcrParseResultApi | null>(null)
  const [error, setError]         = useState<string | null>(null)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  async function handleParse() {
    if (!text.trim()) return
    setStep('validating')
    setError(null)

    try {
      const res  = await fetch('/api/ocr/parse', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text: text.trim(), profile: 'lastwar-vs' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error?.message ?? (isFrench ? 'Erreur de parsing' : 'Parsing error'))
      setResult(data.data)
      setStep('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : (isFrench ? 'Erreur inconnue' : 'Unknown error'))
      setStep('error')
    }
  }

  async function handleConfirm(rows: Array<{ playerId: number; score: number }>) {
    setConfirming(true)
    setError(null)

    try {
      const res  = await fetch('/api/ocr/confirm', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ weekId: Number(weekId), dayOfWeek, rows }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error?.message ?? (isFrench ? "Erreur d'import" : 'Import error'))

      const count = data.data?.imported ?? rows.length
      setImportMsg(t.importSuccess
        .replace('{count}', String(count))
        .replace('{s}', count > 1 ? 's' : ''))
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : (isFrench ? 'Erreur inconnue' : 'Unknown error'))
    } finally {
      setConfirming(false)
    }
  }

  function handleReset() {
    setStep('input')
    setText('')
    setResult(null)
    setError(null)
    setImportMsg(null)
  }

  return (
    <Card>
      <CardHeader
        title={t.importTitle}
        subtitle={t.importSubtitle}
      />

      <div className="mt-4 space-y-4">

        {/* Week + day selectors — always visible */}
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="label-xs block mb-1">{t.weekLabel}</label>
            <select
              value={weekId}
              onChange={(e) => setWeekId(e.target.value)}
              disabled={step === 'review' || step === 'done'}
              className="px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] disabled:opacity-50"
            >
              {weeks.map((w) => (
                <option key={w.id} value={w.id}>{w.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label-xs block mb-1">{t.dayLabel}</label>
            <div className="flex gap-1.5">
              {([1, 2, 3, 4, 5, 6] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDayOfWeek(d)}
                  disabled={step === 'review' || step === 'done'}
                  className={[
                    'px-3 py-2 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50',
                    dayOfWeek === d
                      ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                      : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]/40',
                  ].join(' ')}
                >
                  {tTrains.daysShort[d - 1]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Input step */}
        {(step === 'input' || step === 'error') && (
          <>
            <div>
              <label className="label-xs block mb-1">{t.textLabel}</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={10}
                placeholder={t.textPlaceholder}
                className="w-full px-3 py-2.5 text-sm font-mono rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] resize-y min-h-[160px]"
              />
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                {t.textHint}
              </p>
            </div>

            {error && (
              <p className="text-sm text-[var(--color-danger)]">{error}</p>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={handleParse}
                disabled={!text.trim() || !weekId}
                className="px-5 py-2 text-sm bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-40"
              >
                {t.btnAnalyze}
              </button>
              {text.trim() && (
                <span className="text-xs text-[var(--color-text-muted)]">
                  {t.lineCount.replace('{n}', String(text.split('\n').filter((l) => l.trim()).length))}
                </span>
              )}
            </div>
          </>
        )}

        {/* Validating step */}
        {step === 'validating' && (
          <div className="flex items-center gap-3 py-6 text-sm text-[var(--color-text-muted)]">
            <span className="w-4 h-4 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin shrink-0" />
            {t.analyzing}
          </div>
        )}

        {/* Review step */}
        {step === 'review' && result && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                {t.validationTitle
                  .replace('{day}', tTrains.daysShort[dayOfWeek - 1] ?? '')
                  .replace('{week}', weeks.find((w) => String(w.id) === weekId)?.label ?? '')}
              </p>
              <button
                onClick={handleReset}
                className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
              >
                {t.btnBack}
              </button>
            </div>

            {error && (
              <p className="text-sm text-[var(--color-danger)]">{error}</p>
            )}

            <OcrValidationTable
              result={result}
              onConfirm={handleConfirm}
              confirming={confirming}
            />
          </>
        )}

        {/* Done step */}
        {step === 'done' && (
          <div className="space-y-3">
            {importMsg && (
              <p className="text-sm text-[var(--color-success)]">{importMsg}</p>
            )}
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm border border-[var(--color-border)] text-[var(--color-text-muted)] rounded-lg hover:border-[var(--color-accent)]/40 transition-colors"
            >
              {t.btnNewAnalysis}
            </button>
          </div>
        )}
      </div>
    </Card>
  )
}
