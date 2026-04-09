import { TopBar } from '@/components/layout/TopBar'
import { ProfessionsTable } from '@/features/professions/components/ProfessionsTable'
import { getAllProfessions } from '@/server/services/professionService'
import { getAllWeeks } from '@/server/services/weekService'
import { PROFESSION_KEYS } from '@/server/validators/professionValidator'
import { MAX_PROFESSION_LEVEL } from '@/server/engines/ratingEngine'
import { Badge } from '@/components/ui/Badge'
import { getLocale, getDict } from '@/lib/i18n/server'

export default async function ProfessionsPage() {
  const [locale, professions, weeks] = await Promise.all([
    getLocale(),
    getAllProfessions(),
    getAllWeeks(),
  ])

  const dict = await getDict(locale)
  const d    = dict.professions

  const avgLevel = professions.length > 0
    ? Math.round(professions.reduce((sum, p) => sum + p.level, 0) / professions.length)
    : 0

  return (
    <>
      <TopBar weeks={weeks} selectedWeekId={weeks[0]?.id ?? 0} title={d.pageTitle} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 stagger">
            <StatPill label={d.statsConfigured} value={String(professions.length)} />
            <StatPill
              label={d.statsAvgLevel}
              value={avgLevel > 0 ? `${avgLevel} / ${MAX_PROFESSION_LEVEL}` : '—'}
            />
            <StatPill
              label={d.statsActive}
              value={String(new Set(professions.map((p) => p.professionKey)).size)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="label-xs">{d.legendLabel}</span>
            {PROFESSION_KEYS.map((key) => (
              <Badge key={key} variant="neutral">{key}</Badge>
            ))}
          </div>

          <ProfessionsTable professions={professions} dict={d} />
        </div>
      </main>
    </>
  )
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 card-shadow">
      <p className="label-sm mb-1">{label}</p>
      <p className="text-2xl font-bold text-[var(--color-text-primary)]">{value}</p>
    </div>
  )
}
