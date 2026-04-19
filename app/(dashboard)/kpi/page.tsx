import { Suspense } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { Card, CardHeader } from '@/components/ui/Card'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { getAllianceStats } from '@/server/services/allianceStatsService'
import { getLocale } from '@/lib/i18n/server'
import { formatScoreCompact } from '@/lib/utils'
import { requireAuth } from '@/server/security/authGuard'
import type { AllianceKpiStats, AlliancePlayerEntry, AllianceWeekEntry } from '@/types/api'

export const maxDuration = 60

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(n: number) {
  return `${Math.round(n * 100)}%`
}

// ─── Player row — shared across top/flop/absent/DS panels ─────────────────────

function PlayerRow({
  entry,
  rank,
  valueLabel,
  extraLabel,
  valueClass = '',
}: {
  entry: AlliancePlayerEntry
  rank: number
  valueLabel: string
  extraLabel?: string
  valueClass?: string
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--color-border)] last:border-b-0">
      <span className="w-5 text-center text-xs font-bold text-[var(--color-text-muted)] shrink-0 tabular-nums">
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate leading-tight">
          {entry.playerName}
        </p>
        {entry.playerAlias && (
          <p className="text-xs text-[var(--color-text-muted)] truncate leading-tight">
            {entry.playerAlias}
          </p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className={`text-sm font-bold tabular-nums ${valueClass || 'text-[var(--color-accent)]'}`}>
          {valueLabel}
        </p>
        {extraLabel && (
          <p className="text-xs text-[var(--color-text-muted)] tabular-nums">{extraLabel}</p>
        )}
      </div>
    </div>
  )
}

// ─── Empty panel placeholder ──────────────────────────────────────────────────

function EmptyRows({ message }: { message: string }) {
  return (
    <p className="px-4 py-6 text-center text-sm text-[var(--color-text-muted)]">{message}</p>
  )
}

// ─── Stat pill ────────────────────────────────────────────────────────────────

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <span className="text-[0.65rem] text-[var(--color-text-muted)] uppercase tracking-wide font-semibold">{label}</span>
      <span className="text-lg font-bold text-[var(--color-text-primary)] tabular-nums leading-tight">{value}</span>
    </div>
  )
}

// ─── Trend table ──────────────────────────────────────────────────────────────

function TrendTable({ rows, isFr }: { rows: AllianceWeekEntry[]; isFr: boolean }) {
  if (rows.length === 0) return null

  return (
    <div className="overflow-x-auto -mx-5 px-5">
      <table className="w-full text-xs min-w-[340px]">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            <th className="text-left py-2 pr-3 text-[var(--color-text-muted)] font-medium">
              {isFr ? 'Semaine' : 'Week'}
            </th>
            <th className="text-right py-2 px-3 text-[var(--color-text-muted)] font-medium">
              {isFr ? 'Score total' : 'Total score'}
            </th>
            <th className="text-right py-2 px-3 text-[var(--color-text-muted)] font-medium">
              {isFr ? 'Joueurs actifs' : 'Active players'}
            </th>
            <th className="text-right py-2 pl-3 text-[var(--color-text-muted)] font-medium">
              {isFr ? 'Moy. / joueur' : 'Avg / player'}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.weekLabel}
              className={[
                'border-b border-[var(--color-border)] last:border-b-0',
                i === rows.length - 1 ? 'font-semibold' : '',
              ].join(' ')}
            >
              <td className="py-2 pr-3 text-[var(--color-text-secondary)]">{row.weekLabel}</td>
              <td className="py-2 px-3 text-right text-[var(--color-accent)] tabular-nums font-medium">
                {formatScoreCompact(row.totalScore)}
              </td>
              <td className="py-2 px-3 text-right text-[var(--color-text-secondary)] tabular-nums">
                {row.activePlayers}
              </td>
              <td className="py-2 pl-3 text-right text-[var(--color-text-muted)] tabular-nums">
                {formatScoreCompact(row.avgScore)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main content ─────────────────────────────────────────────────────────────

async function KpiContent() {
  const [stats, locale] = await Promise.all([
    getAllianceStats(),
    getLocale(),
  ])

  const isFr = locale === 'fr'
  const N = stats.weeksConsidered

  if (N === 0) {
    return (
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:py-6">
          <p className="text-sm text-[var(--color-text-muted)]">
            {isFr
              ? 'Aucune semaine VS enregistrée. Créez une semaine pour voir les statistiques.'
              : 'No VS weeks found. Create a week to see statistics.'}
          </p>
        </div>
      </main>
    )
  }

  const noData = isFr ? 'Aucune donnée' : 'No data'
  const subtitle = isFr
    ? `Sur ${N} semaine${N > 1 ? 's' : ''} · ${stats.weekLabels[0]} → ${stats.weekLabels[N - 1]}`
    : `Over ${N} week${N > 1 ? 's' : ''} · ${stats.weekLabels[0]} → ${stats.weekLabels[N - 1]}`

  // Computed-at date formatted
  const computedAtDate = new Date(stats.computedAt)
  const computedAtLabel = computedAtDate.toLocaleDateString(
    isFr ? 'fr-FR' : 'en-GB',
    { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' },
  )

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6">

        {/* ── Global header stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatPill
            label={isFr ? 'Score alliance' : 'Alliance score'}
            value={formatScoreCompact(stats.totalScore4w)}
          />
          <StatPill
            label={isFr ? 'Moy. / joueur actif' : 'Avg / active player'}
            value={formatScoreCompact(stats.globalAvgScore4w)}
          />
          <StatPill
            label={isFr ? 'Participation moy.' : 'Avg participation'}
            value={pct(stats.avgParticipation4w)}
          />
          <StatPill
            label={isFr ? 'Semaines' : 'Weeks'}
            value={`${N}`}
          />
        </div>

        {/* ── VS Rankings — 2-col grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Top VS */}
          <Card padding="none">
            <div className="px-4 pt-4 pb-2">
              <CardHeader
                title={isFr ? '🏆 Top VS' : '🏆 Top VS'}
                subtitle={subtitle}
              />
            </div>
            {stats.topVS.length === 0
              ? <EmptyRows message={noData} />
              : stats.topVS.map((e, i) => (
                  <PlayerRow
                    key={e.playerId}
                    entry={e}
                    rank={i + 1}
                    valueLabel={formatScoreCompact(e.value)}
                    extraLabel={`${e.extra} j.`}
                    valueClass="text-[var(--color-accent)]"
                  />
                ))
            }
            <div className="pb-2" />
          </Card>

          {/* Flop VS */}
          <Card padding="none">
            <div className="px-4 pt-4 pb-2">
              <CardHeader
                title={isFr ? '📉 Flop VS' : '📉 Flop VS'}
                subtitle={subtitle}
              />
            </div>
            {stats.flopVS.length === 0
              ? <EmptyRows message={noData} />
              : stats.flopVS.map((e, i) => (
                  <PlayerRow
                    key={e.playerId}
                    entry={e}
                    rank={i + 1}
                    valueLabel={formatScoreCompact(e.value)}
                    extraLabel={`${e.extra} j.`}
                    valueClass="text-[var(--color-danger)]"
                  />
                ))
            }
            <div className="pb-2" />
          </Card>
        </div>

        {/* ── Absences + DS — 2-col grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Most absent */}
          <Card padding="none">
            <div className="px-4 pt-4 pb-2">
              <CardHeader
                title={isFr ? '😴 Plus souvent absent' : '😴 Most absent'}
                subtitle={isFr ? 'Jours joués (total)' : 'Days played (total)'}
              />
            </div>
            {stats.mostAbsent.length === 0
              ? <EmptyRows message={noData} />
              : stats.mostAbsent.map((e, i) => (
                  <PlayerRow
                    key={e.playerId}
                    entry={e}
                    rank={i + 1}
                    valueLabel={`${e.value} / ${e.extra} j.`}
                    extraLabel={`${e.extra - e.value} ${isFr ? 'abs.' : 'abs.'}`}
                    valueClass="text-[var(--color-text-secondary)]"
                  />
                ))
            }
            <div className="pb-2" />
          </Card>

          {/* Least DS */}
          <Card padding="none">
            <div className="px-4 pt-4 pb-2">
              <CardHeader
                title={isFr ? '🌪️ Moins inscrits DS' : '🌪️ Least registered DS'}
                subtitle={isFr
                  ? `Sur ${N} semaine${N > 1 ? 's' : ''} disponibles`
                  : `Over ${N} week${N > 1 ? 's' : ''} available`}
              />
            </div>
            {stats.leastDS.length === 0
              ? <EmptyRows message={noData} />
              : stats.leastDS.map((e, i) => (
                  <PlayerRow
                    key={e.playerId}
                    entry={e}
                    rank={i + 1}
                    valueLabel={`${e.value} / ${e.extra} sem.`}
                    valueClass="text-[var(--color-text-secondary)]"
                  />
                ))
            }
            <div className="pb-2" />
          </Card>
        </div>

        {/* ── Tendance alliance ── */}
        <Card>
          <CardHeader
            title={isFr ? '📊 Tendance alliance' : '📊 Alliance trend'}
            subtitle={subtitle}
          />
          <TrendTable rows={stats.weeklyTotals} isFr={isFr} />
        </Card>

        {/* ── Parfaite assiduité ── */}
        {stats.perfectAttendance.length > 0 && (
          <Card padding="none">
            <div className="px-4 pt-4 pb-2">
              <CardHeader
                title={isFr ? '✅ Assiduité parfaite' : '✅ Perfect attendance'}
                subtitle={isFr
                  ? `6/6 jours toutes semaines · ${stats.perfectAttendance.length} joueur${stats.perfectAttendance.length > 1 ? 's' : ''}`
                  : `6/6 days every week · ${stats.perfectAttendance.length} player${stats.perfectAttendance.length > 1 ? 's' : ''}`}
              />
            </div>
            {stats.perfectAttendance.map((e, i) => (
              <PlayerRow
                key={e.playerId}
                entry={e}
                rank={i + 1}
                valueLabel={`${e.value} / ${e.extra} sem.`}
                valueClass="text-[var(--color-success)]"
              />
            ))}
            <div className="pb-2" />
          </Card>
        )}

        {/* ── Computed-at notice ── */}
        <p className="text-xs text-[var(--color-text-muted)] text-center">
          {isFr
            ? `Calculé le ${computedAtLabel} · Mise à jour automatique à 04h00`
            : `Computed on ${computedAtLabel} · Auto-updated at 04:00 UTC`}
        </p>

      </div>
    </main>
  )
}

function KpiSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-[var(--color-surface-raised)] animate-pulse border border-[var(--color-border)]" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </div>
        <SkeletonCard lines={5} />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function KpiPage() {
  await requireAuth('dashboard:view')
  const isFr = (await getLocale()) === 'fr'

  return (
    <>
      <TopBar
        weeks={[]}
        selectedWeekId={0}
        showWeekSelector={false}
        title={isFr ? 'Statistiques alliance' : 'Alliance statistics'}
      />
      <Suspense fallback={<KpiSkeleton />}>
        <KpiContent />
      </Suspense>
    </>
  )
}
