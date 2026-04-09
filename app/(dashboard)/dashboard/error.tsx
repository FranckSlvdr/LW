'use client'

import { useEffect } from 'react'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Error boundary pour le dashboard — Client Component obligatoire.
 * Capte les erreurs du Server Component (ex: DB inaccessible, weekId invalide).
 * Ne fuite jamais les détails techniques en production.
 */
export default function DashboardError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log côté client uniquement en développement
    if (process.env.NODE_ENV === 'development') {
      console.error('[Dashboard Error]', error)
    }
  }, [error])

  const isDev = process.env.NODE_ENV === 'development'
  const isDbError =
    error.message.includes('DATABASE_URL') ||
    error.message.includes('connect') ||
    error.message.includes('ECONNREFUSED')

  return (
    <main className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-4 max-w-md px-6">
        <div className="text-5xl">⚠️</div>

        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
          {isDbError ? 'Base de données inaccessible' : 'Une erreur est survenue'}
        </h2>

        <p className="text-sm text-[var(--color-text-secondary)]">
          {isDbError
            ? 'Vérifiez que DATABASE_URL est défini dans .env.local et que PostgreSQL est accessible.'
            : 'Le dashboard n\'a pas pu charger les données. Réessayez ou contactez un administrateur.'}
        </p>

        {/* Message technique uniquement en développement */}
        {isDev && (
          <pre className="text-left text-xs bg-[var(--color-surface-raised)] border border-[var(--color-danger)]/30 rounded-lg p-3 text-[var(--color-danger)] overflow-auto max-h-32 whitespace-pre-wrap">
            {error.message}
          </pre>
        )}

        {isDbError && (
          <div className="text-left bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-lg p-3 space-y-1">
            <p className="text-xs font-semibold text-[var(--color-text-secondary)]">Checklist :</p>
            <ul className="text-xs text-[var(--color-text-muted)] space-y-1 list-disc list-inside">
              <li>DATABASE_URL défini dans <code>.env.local</code></li>
              <li>PostgreSQL démarré et accessible</li>
              <li>Migration <code>001_initial.sql</code> exécutée</li>
            </ul>
          </div>
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
