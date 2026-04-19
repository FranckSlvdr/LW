'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { useI18n } from '@/lib/i18n/client'
import { AUDIT_FILTER_ACTIONS, AUDIT_FILTER_ENTITIES, getAdminMessages } from '../messages'

export function AuditFilter() {
  const { locale } = useI18n()
  const t = getAdminMessages(locale)
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentAction = searchParams.get('action') ?? ''
  const currentEntity = searchParams.get('entityType') ?? ''

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('offset')
    startTransition(() => router.push(`?${params.toString()}`))
  }

  return (
    <div className={`flex gap-3 flex-wrap transition-opacity ${isPending ? 'opacity-50' : ''}`}>
      <select
        value={currentAction}
        onChange={(e) => update('action', e.target.value)}
        className="text-sm px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-accent)]"
      >
        <option value="">{t.audit.allActions}</option>
        {AUDIT_FILTER_ACTIONS.map((action) => (
          <option key={action} value={action}>{t.actionLabels[action]}</option>
        ))}
      </select>
      <select
        value={currentEntity}
        onChange={(e) => update('entityType', e.target.value)}
        className="text-sm px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-accent)]"
      >
        <option value="">{t.entityLabels['']}</option>
        {AUDIT_FILTER_ENTITIES.map((entity) => (
          <option key={entity} value={entity}>{t.entityLabels[entity]}</option>
        ))}
      </select>
      {(currentAction || currentEntity) && (
        <button
          onClick={() => startTransition(() => router.push('?'))}
          className="text-sm px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          {t.audit.reset}
        </button>
      )}
    </div>
  )
}
