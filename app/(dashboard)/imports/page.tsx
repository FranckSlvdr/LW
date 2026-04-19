import { Suspense } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { ImportsHistory } from '@/features/imports/components/ImportsHistory'
import { ImportUploader } from '@/features/imports/components/ImportUploader'
import { OcrImporter } from '@/features/imports/components/OcrImporter'
import { ExportButton } from '@/components/ui/ExportButton'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { getRecentImports } from '@/server/services/importService'
import { getAllWeeks } from '@/server/services/weekService'
import { getSessionUser, hasPermission } from '@/server/security/authGuard'
import { getLocale, getDict } from '@/lib/i18n/server'
import { getImportsMessages } from '@/features/imports/messages'
import type { WeekApi } from '@/types/api'
import type { Dictionary } from '@/lib/i18n/types'

export const maxDuration = 60

async function ImportsContent({
  weeks,
  canImport,
  locale,
  dict,
}: {
  weeks: WeekApi[]
  canImport: boolean
  locale: string
  dict: Dictionary
}) {
  const imports = await getRecentImports(50)
  const messages = getImportsMessages(locale === 'fr' ? 'fr' : 'en')

  const exportRows = imports.map((imp) => ({
    [messages.exports.columns.date]: imp.createdAt.toISOString().split('T')[0],
    [messages.exports.columns.time]: imp.createdAt.toISOString().split('T')[1]?.slice(0, 5) ?? '',
    [messages.exports.columns.type]: imp.importType,
    [messages.exports.columns.file]: imp.filename ?? '',
    [messages.exports.columns.status]: imp.status,
    [messages.exports.columns.total]: imp.rowsTotal,
    [messages.exports.columns.imported]: imp.rowsImported,
    [messages.exports.columns.skipped]: imp.rowsSkipped,
    [messages.exports.columns.by]: imp.importedBy ?? '',
  }))

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-6">
        {canImport && <OcrImporter weeks={weeks} />}
        {canImport && <ImportUploader weeks={weeks} />}
        <div className="flex justify-end">
          <ExportButton
            rows={exportRows}
            filename={messages.exports.filename}
            sheetName={messages.exports.sheetName}
          />
        </div>
        <ImportsHistory imports={imports} locale={locale} dict={dict.imports} />
      </div>
    </main>
  )
}

function ImportsSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-6">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={4} />
        <SkeletonCard lines={10} />
      </div>
    </div>
  )
}

export default async function ImportsPage() {
  const [locale, weeks, user] = await Promise.all([
    getLocale(),
    getAllWeeks(),
    getSessionUser(),
  ])
  const canImport = user ? hasPermission(user.role, 'scores:import') : false
  const dict = await getDict(locale)

  return (
    <>
      <TopBar weeks={weeks} selectedWeekId={weeks[0]?.id ?? 0} title={dict.nav.imports} showWeekSelector={false} />
      <Suspense fallback={<ImportsSkeleton />}>
        <ImportsContent weeks={weeks} canImport={canImport} locale={locale} dict={dict} />
      </Suspense>
    </>
  )
}
