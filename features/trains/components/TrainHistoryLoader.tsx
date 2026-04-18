'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { ExportButton } from '@/components/ui/ExportButton'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { TrainHistory } from '@/features/trains/components/TrainHistory'
import { useI18n } from '@/lib/i18n/client'
import type { TrainRunApi } from '@/types/api'

interface TrainHistoryLoaderProps {
  limit?: number
}

export function TrainHistoryLoader({ limit = 14 }: TrainHistoryLoaderProps) {
  const { dict, locale } = useI18n()
  const t = dict.trains
  const isFrench = locale.startsWith('fr')
  const [runs, setRuns] = useState<TrainRunApi[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    async function loadHistory() {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch(`/api/trains?limit=${limit}`, {
          cache: 'no-store',
          signal: controller.signal,
        })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data?.error?.message ?? (isFrench ? 'Erreur de chargement' : 'Loading error'))
        }
        setRuns(Array.isArray(data?.data) ? data.data : [])
      } catch (err) {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err.message : (isFrench ? 'Erreur inconnue' : 'Unknown error'))
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void loadHistory()

    return () => controller.abort()
  }, [isFrench, limit])

  async function handleRetry() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/trains?limit=${limit}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error?.message ?? (isFrench ? 'Erreur de chargement' : 'Loading error'))
      }
      setRuns(Array.isArray(data?.data) ? data.data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : (isFrench ? 'Erreur inconnue' : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  if (loading && !runs) {
    return <SkeletonCard lines={10} />
  }

  if (error) {
    return (
      <Card>
        <CardHeader title={t.historyTitle} subtitle={error} />
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-[var(--color-text-muted)]">
            {isFrench ? "L'historique peut etre recharge separement." : 'The history can be reloaded separately.'}
          </p>
          <button
            onClick={handleRetry}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold rounded-lg border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 transition-colors disabled:opacity-40"
          >
            {loading ? (isFrench ? 'Chargement...' : 'Loading...') : (isFrench ? 'Reessayer' : 'Retry')}
          </button>
        </div>
      </Card>
    )
  }

  const history = runs ?? []

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ExportButton
          rows={history.flatMap((run) =>
            run.selections.map((sel) => ({
              'Semaine': run.weekLabel,
              'Jour': run.trainDayLabel,
              'Position': sel.position,
              'Joueur': sel.playerName,
              'Alias': sel.playerAlias ?? '',
              'Raison': sel.selectionReason,
            })),
          )}
          filename="trains-historique"
          sheetName="Trains"
        />
      </div>
      <TrainHistory runs={history} />
    </div>
  )
}
