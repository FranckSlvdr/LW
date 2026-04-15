'use client'

import React, { useState } from 'react'
import { useI18n } from '@/lib/i18n/client'
import type { OcrParseResultApi, OcrParsedRowApi, OcrParseIssue } from '@/types/api'

// Issue color map (keys are static, labels come from dict)
const ISSUE_COLORS: Record<OcrParseIssue, string> = {
  low_confidence:      'text-[var(--color-warning)] bg-[var(--color-warning)]/10 border-[var(--color-warning)]/20',
  unresolved_player:   'text-[var(--color-danger)]  bg-[var(--color-danger)]/10  border-[var(--color-danger)]/20',
  invalid_score:       'text-[var(--color-danger)]  bg-[var(--color-danger)]/10  border-[var(--color-danger)]/20',
  possible_ocr_noise:  'text-[var(--color-warning)] bg-[var(--color-warning)]/10 border-[var(--color-warning)]/20',
  duplicate_row:       'text-[var(--color-danger)]  bg-[var(--color-danger)]/10  border-[var(--color-danger)]/20',
  score_too_small:     'text-[var(--color-warning)] bg-[var(--color-warning)]/10 border-[var(--color-warning)]/20',
  merged_lines:        'text-[var(--color-text-muted)] bg-[var(--color-surface-raised)] border-[var(--color-border)]',
  name_truncated:      'text-[var(--color-warning)] bg-[var(--color-warning)]/10 border-[var(--color-warning)]/20',
  ambiguous_player:    'text-[var(--color-warning)] bg-[var(--color-warning)]/10 border-[var(--color-warning)]/20',
}

function confidenceBadge(c: number): { label: string; className: string } {
  if (c >= 0.8) return { label: `${Math.round(c * 100)}%`, className: 'text-[var(--color-success)] bg-[var(--color-success)]/10 border-[var(--color-success)]/20' }
  if (c >= 0.5) return { label: `${Math.round(c * 100)}%`, className: 'text-[var(--color-warning)] bg-[var(--color-warning)]/10 border-[var(--color-warning)]/20' }
  return             { label: `${Math.round(c * 100)}%`, className: 'text-[var(--color-danger)]  bg-[var(--color-danger)]/10  border-[var(--color-danger)]/20'  }
}

// ─── Editable row state ───────────────────────────────────────────────────────

interface RowState {
  included: boolean
  playerId: number | null   // null = unresolved
  score:    number | null
  rawExpanded: boolean
}

function initRowState(row: OcrParsedRowApi): RowState {
  const playerId = row.playerMatch && row.playerMatch.matchType !== 'none'
    ? row.playerMatch.playerId
    : null
  return {
    included:    row.confidence >= 0.5 && playerId !== null && row.extractedScore !== null,
    playerId,
    score:       row.extractedScore,
    rawExpanded: false,
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface OcrValidationTableProps {
  result:    OcrParseResultApi
  onConfirm: (rows: Array<{ playerId: number; score: number }>) => Promise<void>
  confirming: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OcrValidationTable({
  result, onConfirm, confirming,
}: OcrValidationTableProps) {
  const { dict }  = useI18n()
  const t         = dict.ocr
  const [rowStates, setRowStates] = useState<RowState[]>(() =>
    result.rows.map(initRowState),
  )

  // Build issue label map from dict
  const ISSUE_LABELS: Record<OcrParseIssue, string> = {
    low_confidence:      t.issueLowConfidence,
    unresolved_player:   t.issueUnresolvedPlayer,
    invalid_score:       t.issueInvalidScore,
    possible_ocr_noise:  t.issuePossibleOcrNoise,
    duplicate_row:       t.issueDuplicateRow,
    score_too_small:     t.issueScoreTooSmall,
    merged_lines:        t.issueMergedLines,
    name_truncated:      t.issueNameTruncated,
    ambiguous_player:    t.issueAmbiguousPlayer,
  }
  function updateRow(i: number, patch: Partial<RowState>) {
    setRowStates((prev) => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  }

  function toggleAll(included: boolean) {
    setRowStates((prev) => prev.map((r, i) => {
      // Only toggle rows that have enough data to be importable
      if (rowStates[i]?.playerId !== null && rowStates[i]?.score !== null) {
        return { ...r, included }
      }
      return r
    }))
  }

  const readyRows = rowStates.filter((state) => (
    state.included && state.playerId !== null && state.score !== null
  ))

  const includedCount = readyRows.length

  async function handleConfirm() {
    const payload = readyRows.map((state) => ({
      playerId: state.playerId!,
      score:    state.score!,
    }))
    await onConfirm(payload)
  }

  return (
    <div className="space-y-4">

      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <SummaryPill label={t.summaryTotal}      value={result.summary.total} />
        <SummaryPill label={t.summaryHigh}       value={result.summary.highConfidence}   color="text-[var(--color-success)]" />
        <SummaryPill label={t.summaryMedium}     value={result.summary.mediumConfidence} color="text-[var(--color-warning)]" />
        <SummaryPill label={t.summaryLow}        value={result.summary.lowConfidence}    color="text-[var(--color-danger)]" />
        <SummaryPill label={t.summaryUnresolved} value={result.summary.unresolved}       color="text-[var(--color-danger)]" />
        {result.discarded.length > 0 && (
          <SummaryPill label={t.summaryDiscarded} value={result.discarded.length} color="text-[var(--color-text-muted)]" />
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-[var(--color-border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--color-surface-raised)] border-b border-[var(--color-border)]">
              <th className="px-3 py-2.5 text-left">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={rowStates.every((s) => s.included || s.playerId === null || s.score === null)}
                  onChange={(e) => toggleAll(e.target.checked)}
                />
              </th>
              <th className="px-3 py-2.5 text-left text-xs text-[var(--color-text-muted)] font-medium w-16">{t.colConf}</th>
              <th className="px-3 py-2.5 text-left text-xs text-[var(--color-text-muted)] font-medium">{t.colPlayer}</th>
              <th className="px-3 py-2.5 text-right text-xs text-[var(--color-text-muted)] font-medium w-36">{t.colScore}</th>
              <th className="px-3 py-2.5 text-left text-xs text-[var(--color-text-muted)] font-medium">{t.colIssues}</th>
              <th className="px-3 py-2.5 w-8" />
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, i) => {
              const state = rowStates[i]!
              const badge = confidenceBadge(row.confidence)
              const isUsable = state.playerId !== null && state.score !== null
              const rowBg = !isUsable
                ? 'bg-[var(--color-surface-raised)]/30 opacity-60'
                : state.included
                ? ''
                : 'opacity-50'

              return (
                <React.Fragment key={row.rowIndex}>
                  <tr
                    className={`border-b border-[var(--color-border-subtle)] transition-colors ${rowBg}`}
                  >
                    {/* Checkbox */}
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={state.included}
                        disabled={!isUsable}
                        onChange={(e) => updateRow(i, { included: e.target.checked })}
                      />
                    </td>

                    {/* Confidence */}
                    <td className="px-3 py-2.5">
                      <span className={`inline-block px-1.5 py-0.5 rounded border text-[0.65rem] font-bold tabular-nums ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>

                    {/* Player dropdown */}
                    <td className="px-3 py-2.5">
                      <div className="space-y-0.5">
                        <select
                          value={state.playerId ?? ''}
                          onChange={(e) => updateRow(i, {
                            playerId: e.target.value ? Number(e.target.value) : null,
                            included: !!e.target.value && state.score !== null,
                          })}
                          className={[
                            'w-full max-w-[220px] px-2 py-1 text-xs rounded border bg-[var(--color-surface)] focus:outline-none focus:border-[var(--color-accent)]',
                            !state.playerId
                              ? 'border-[var(--color-danger)]/50 text-[var(--color-danger)]'
                              : 'border-[var(--color-border)] text-[var(--color-text-primary)]',
                          ].join(' ')}
                        >
                          <option value="">{t.playerUnresolved}</option>
                          {result.players.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}{p.alias ? ` (${p.alias})` : ''}
                            </option>
                          ))}
                        </select>
                        {row.extractedName && (
                          <p className="text-[0.6rem] text-[var(--color-text-muted)] truncate max-w-[220px]">
                            OCR : &ldquo;{row.extractedName}&rdquo;
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Score input */}
                    <td className="px-3 py-2.5 text-right">
                      <input
                        type="number"
                        min={0}
                        value={state.score ?? ''}
                        onChange={(e) => updateRow(i, {
                          score:    e.target.value ? Number(e.target.value) : null,
                          included: state.playerId !== null && !!e.target.value,
                        })}
                        className={[
                          'w-32 px-2 py-1 text-xs text-right rounded border bg-[var(--color-surface)] focus:outline-none focus:border-[var(--color-accent)] tabular-nums',
                          state.score === null
                            ? 'border-[var(--color-danger)]/50'
                            : 'border-[var(--color-border)]',
                        ].join(' ')}
                      />
                    </td>

                    {/* Issues */}
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {row.issues
                          .filter((iss) => iss !== 'merged_lines') // too noisy to show always
                          .map((iss) => (
                            <span
                              key={iss}
                              className={`inline-block px-1.5 py-0.5 rounded border text-[0.6rem] font-medium ${ISSUE_COLORS[iss]}`}
                            >
                              {ISSUE_LABELS[iss]}
                            </span>
                          ))}
                      </div>
                    </td>

                    {/* Raw text toggle */}
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => updateRow(i, { rawExpanded: !state.rawExpanded })}
                        className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
                        title={t.rawExpandTitle}
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          {state.rawExpanded
                            ? <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                            : <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
                          }
                        </svg>
                      </button>
                    </td>
                  </tr>

                  {/* Raw text expansion row */}
                  {state.rawExpanded && (
                    <tr className="bg-[var(--color-surface-raised)]/50 border-b border-[var(--color-border-subtle)]">
                      <td colSpan={6} className="px-4 py-2">
                        <div className="space-y-1">
                          <p className="text-[0.6rem] text-[var(--color-text-muted)] uppercase tracking-wider font-semibold">
                            {t.rawTextLabel}
                          </p>
                          <p className="text-xs font-mono text-[var(--color-text-secondary)] bg-[var(--color-surface)] px-2 py-1.5 rounded border border-[var(--color-border)] break-all">
                            {row.rawText}
                          </p>
                          {row.ocrCorrections.length > 0 && (
                            <p className="text-[0.6rem] text-[var(--color-warning)]">
                              {t.correctionsLabel.replace('{list}', row.ocrCorrections.join(' · '))}
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Confirm bar */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleConfirm}
          disabled={includedCount === 0 || confirming}
          className="px-5 py-2 text-sm bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-40"
        >
          {confirming
            ? t.importing
            : t.btnImport
                .replace('{n}', String(includedCount))
                .replace('{s}', includedCount !== 1 ? 's' : '')}
        </button>
        <p className="text-xs text-[var(--color-text-muted)]">
          {t.selectedLines
            .replace('{n}', String(includedCount))
            .replace('{total}', String(result.rows.length))
            .replace('{s}', result.rows.length !== 1 ? 's' : '')}
        </p>
      </div>

      {/* Discarded lines (collapsible) */}
      {result.discarded.length > 0 && (
        <DiscardedSection
        lines={result.discarded}
        label={t.discardedLines
          .replace('{n}', String(result.discarded.length))
          .replace('{s}', result.discarded.length !== 1 ? 's' : '')}
      />
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryPill({ label, value, color = 'text-[var(--color-text-primary)]' }: {
  label: string; value: number; color?: string
}) {
  return (
    <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
      <span className={`font-bold tabular-nums ${color}`}>{value}</span>
      <span className="text-[var(--color-text-muted)]">{label}</span>
    </span>
  )
}

function DiscardedSection({ lines, label }: { lines: Array<{ lineIndex: number; text: string; reason: string }>; label: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] flex items-center gap-1 transition-colors"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-90' : ''}`}>
          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
        </svg>
        {label}
      </button>
      {open && (
        <div className="mt-2 space-y-1 text-xs font-mono">
          {lines.map((l) => (
            <div key={l.lineIndex} className="flex items-start gap-3 px-3 py-1.5 rounded bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
              <span className="text-[var(--color-text-muted)] shrink-0">#{l.lineIndex}</span>
              <span className="text-[var(--color-text-secondary)] truncate flex-1">{l.text}</span>
              <span className="text-[var(--color-text-muted)] shrink-0 italic">{l.reason}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
