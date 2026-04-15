'use client'

import { useEffect } from 'react'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function VsError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[VS Error]', error)
    }
  }, [error])

  const isDev = process.env.NODE_ENV === 'development'

  return (
    <main className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-4 max-w-md px-6">
        <div className="text-5xl">⚠️</div>
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
          Erreur lors du chargement des scores VS
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Les données n&apos;ont pas pu être chargées. Réessayez ou contactez un administrateur.
        </p>
        {isDev && (
          <pre className="text-left text-xs bg-[var(--color-surface-raised)] border border-[var(--color-danger)]/30 rounded-lg p-3 text-[var(--color-danger)] overflow-auto max-h-32 whitespace-pre-wrap">
            {error.message}
          </pre>
        )}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={reset}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--color-accent)] text-white hover:opacity-90 transition-opacity"
          >
            Réessayer
          </button>
        </div>
        {error.digest && (
          <p className="text-xs text-[var(--color-text-muted)]">Code : {error.digest}</p>
        )}
      </div>
    </main>
  )
}
