import { Suspense } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { TrainSettingsPanel } from '@/features/trains/components/TrainSettingsPanel'
import { WeekManagerPanel } from '@/features/weeks/components/WeekManagerPanel'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { getTrainSettings } from '@/server/services/trainService'
import { getSessionUser, hasPermission } from '@/server/security/authGuard'
import { getLocale, getDict } from '@/lib/i18n/server'
import type { WeekApi } from '@/types/api'
export const maxDuration = 60

async function SettingsContent({ canConfigure, canManageWeeks }: {
  canConfigure: boolean
  canManageWeeks: boolean
}) {
  const settings = await getTrainSettings()

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-[900px] mx-auto px-6 py-6 space-y-6">

        {canManageWeeks && (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide font-semibold mb-4">
              Semaines VS
            </p>
            <div className="max-w-sm">
              <WeekManagerPanel />
            </div>
          </div>
        )}

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
  )
}

function SettingsSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[900px] mx-auto px-6 py-6 space-y-6">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={6} />
      </div>
    </div>
  )
}

export default async function SettingsPage() {
  const [locale, user] = await Promise.all([
    getLocale(),
    getSessionUser(),
  ])
  const dict         = await getDict(locale)
  const canConfigure   = user ? hasPermission(user.role, 'trains:configure') : false
  const canManageWeeks = user ? hasPermission(user.role, 'weeks:manage')     : false

  return (
    <>
      <TopBar weeks={[] as WeekApi[]} selectedWeekId={0} title={dict.nav.settings} showWeekSelector={false} />
      <Suspense fallback={<SettingsSkeleton />}>
        <SettingsContent canConfigure={canConfigure} canManageWeeks={canManageWeeks} />
      </Suspense>
    </>
  )
}
