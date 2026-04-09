'use client'

import { useEffect } from 'react'

interface PageErrorProps {
  error: Error & { digest?: string }
  reset: () => void
  pageName?: string
}

/**
 * Generic error boundary UI — used by all (dashboard) route error.tsx files.
 * Never leaks internal error details in production.
 */
export function PageError({ error, reset, pageName }: PageErrorProps) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${pageName ?? 'Page'} Error]`, error)
    }
  }, [error, pageName])

  const isDev = process.env.NODE_ENV === 'development'
  const isDbError =
    error.message.includes('DATABASE_URL') ||
    error.message.includes('connect') ||
    error.message.includes('ECONNREFUSED')

  return (
    <main className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-4 max-w-md px-6">
        <div className="text-4xl select-none">⚠️</div>

        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
          {isDbError ? 'Base de données inaccessible' : 'Une erreur est survenue'}
        </h2>

        <p className="text-sm text-[var(--color-text-secondary)]">
          {isDbError
            ? 'Vérifiez que DATABASE_URL est défini et que PostgreSQL est accessible.'
            : `La page${pageName ? ` ${pageName}` : ''} n'a pas pu charger les données. Réessayez ou contactez un administrateur.`}
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
