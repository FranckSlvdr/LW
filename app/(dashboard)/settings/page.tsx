import { TopBar } from '@/components/layout/TopBar'
import { TrainSettingsPanel } from '@/features/trains/components/TrainSettingsPanel'
import { getTrainSettings } from '@/server/services/trainService'
import { getAllWeeks } from '@/server/services/weekService'
import { getSessionUser, hasPermission } from '@/server/security/authGuard'
import { getLocale, getDict } from '@/lib/i18n/server'

export default async function SettingsPage() {
  const [locale, weeks, settings, user] = await Promise.all([
    getLocale(),
    getAllWeeks(),
    getTrainSettings(),
    getSessionUser(),
  ])
  const canConfigure = user ? hasPermission(user.role, 'trains:configure') : false
  const dict = await getDict(locale)

  return (
    <>
      <TopBar weeks={weeks} selectedWeekId={weeks[0]?.id ?? 0} title={dict.nav.settings} showWeekSelector={false} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[900px] mx-auto px-6 py-6 space-y-6">

          {canConfigure ? (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide font-semibold mb-4">
                Gestion des trains
              </p>
              <div className="max-w-sm">
                <TrainSettingsPanel settings={settings} />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
              <p className="text-sm text-[var(--color-text-muted)]">
                Accès restreint — configuration réservée aux administrateurs.
              </p>
            </div>
          )}

        </div>
      </main>
    </>
  )
}
