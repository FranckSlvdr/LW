'use client'

import { useEffect } from 'react'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Global Error]', error)
    }
  }, [error])

  const isDev = process.env.NODE_ENV === 'development'

  return (
    <html>
      <body>
        <main className="min-h-screen flex items-center justify-center bg-[var(--color-bg-base)] px-4">
          <div className="text-center space-y-4 max-w-md">
            <div className="text-5xl">💥</div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
              Une erreur inattendue est survenue
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              L&apos;application a rencontré un problème critique. Réessayez ou contactez un administrateur.
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
                Réessayer
              </button>
              <a
                href="/dashboard"
                className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-600 text-gray-300 hover:border-gray-400 transition-colors"
              >
                Retour à l&apos;accueil
              </a>
            </div>
            {error.digest && (
              <p className="text-xs text-gray-500">Code : {error.digest}</p>
            )}
          </div>
        </main>
      </body>
    </html>
  )
}
