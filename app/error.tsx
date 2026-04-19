'use client'

import { useEffect, useMemo } from 'react'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

function detectLocale(): 'fr' | 'en' {
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=(fr|en)(?:;|$)/)
    if (match?.[1] === 'en') return 'en'
    if (match?.[1] === 'fr') return 'fr'
  }

  if (typeof navigator !== 'undefined') {
    return navigator.language.toLowerCase().startsWith('en') ? 'en' : 'fr'
  }

  return 'fr'
}

export default function GlobalError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Global Error]', error)
    }
  }, [error])

  const locale = useMemo(() => detectLocale(), [])
  const isFrench = locale === 'fr'
  const isDev = process.env.NODE_ENV === 'development'

  return (
    <html lang={locale}>
      <body>
        <main className="min-h-screen flex items-center justify-center bg-[var(--color-bg-base)] px-4">
          <div className="text-center space-y-4 max-w-md">
            <div className="text-5xl">{'\u{1F4A5}'}</div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
              {isFrench ? 'Une erreur inattendue est survenue' : 'An unexpected error occurred'}
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {isFrench
                ? "L'application a rencontre un probleme critique. Reessayez ou contactez un administrateur."
                : 'The application encountered a critical problem. Retry or contact an administrator.'}
            </p>
            {isDev && (
              <pre className="text-left text-xs bg-[var(--color-surface-raised)] border border-red-500/30 rounded-lg p-3 text-red-400 overflow-auto max-h-40 whitespace-pre-wrap">
                {error.message}
              </pre>
            )}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={reset}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                {isFrench ? 'Reessayer' : 'Retry'}
              </button>
              <a
                href="/dashboard"
                className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-600 text-gray-300 hover:border-gray-400 transition-colors"
              >
                {isFrench ? "Retour a l'accueil" : 'Back to home'}
              </a>
            </div>
            {error.digest && (
              <p className="text-xs text-gray-500">Code: {error.digest}</p>
            )}
          </div>
        </main>
      </body>
    </html>
  )
}
