import { TopBar } from '@/components/layout/TopBar'
import { ImportsHistory } from '@/features/imports/components/ImportsHistory'
import { ImportUploader } from '@/features/imports/components/ImportUploader'
import { OcrImporter } from '@/features/imports/components/OcrImporter'
import { getRecentImports } from '@/server/services/importService'
import { getAllWeeks } from '@/server/services/weekService'
import { getSessionUser, hasPermission } from '@/server/security/authGuard'
import { getLocale, getDict } from '@/lib/i18n/server'

export default async function ImportsPage() {
  const [locale, weeks, imports, user] = await Promise.all([
    getLocale(),
    getAllWeeks(),
    getRecentImports(50),
    getSessionUser(),
  ])
  const canImport = user ? hasPermission(user.role, 'scores:import') : false

  const dict = await getDict(locale)

  return (
    <>
      <TopBar weeks={weeks} selectedWeekId={weeks[0]?.id ?? 0} title={dict.nav.imports} showWeekSelector={false} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-6">
          {canImport && <OcrImporter weeks={weeks} />}
          {canImport && <ImportUploader weeks={weeks} />}
          <ImportsHistory imports={imports} locale={locale} dict={dict.imports} />
        </div>
      </main>
    </>
  )
}
