'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { LOCALES, LOCALE_FLAGS, LOCALE_LABELS } from '@/lib/i18n/config'
import { useI18n } from '@/lib/i18n/client'

export function LanguageSwitcher() {
  const { locale } = useI18n()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  async function switchTo(next: string) {
    const response = await fetch('/api/locale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: next }),
    })
    if (!response.ok) return
    startTransition(() => router.refresh())
  }

  return (
    <div className="flex items-center gap-1">
      {LOCALES.map((loc) => (
        <button
          key={loc}
          onClick={() => switchTo(loc)}
          disabled={isPending}
          title={LOCALE_LABELS[loc]}
          className={[
            'w-7 h-7 rounded-md text-sm flex items-center justify-center transition-colors',
            loc === locale
              ? 'bg-[var(--color-surface-raised)] ring-1 ring-[var(--color-border)]'
              : 'hover:bg-[var(--color-surface-raised)] opacity-50 hover:opacity-100',
            isPending ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
          ].join(' ')}
        >
          {LOCALE_FLAGS[loc]}
        </button>
      ))}
    </div>
  )
}
