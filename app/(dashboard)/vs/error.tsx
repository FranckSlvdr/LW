'use client'

import { useI18n } from '@/lib/i18n/client'
import { PageError } from '@/components/ui/PageError'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function VsError(props: ErrorPageProps) {
  const { locale } = useI18n()
  return <PageError {...props} pageName={locale === 'fr' ? 'scores VS' : 'VS scores'} />
}
