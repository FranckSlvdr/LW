import 'server-only'
import { unstable_cache, revalidateTag } from 'next/cache'
import { IS_VERCEL_RUNTIME, USE_NEXT_DATA_CACHE } from '@/server/config/runtime'
import { computeRatings } from '@/server/engines/ratingEngine'
import {
  loadActiveRatingRules,
  createRatingRun,
  setRatingRunStatus,
  activateRatingRun,
  bulkUpsertPlayerRatings,
  findActiveRunForWeek,
  findPlayerRatingsByRun,
} from '@/server/repositories/ratingRepository'
import { findWeekById } from '@/server/repositories/weekRepository'
import { findAllPlayers } from '@/server/repositories/playerRepository'
import { findScoresByWeek } from '@/server/repositories/scoreRepository'
import { aggregateEventScoresByDateRange } from '@/server/repositories/eventRepository'
import { findAllProfessionLevels } from '@/server/repositories/professionRepository'
import { computeKpis } from '@/server/engines/kpiEngine'
import { NotFoundError } from '@/lib/errors'
import type { TriggerRatingRunResult } from '@/types/api'
import type { PlayerRating } from '@/types/domain'

// ─── Trigger a rating run ─────────────────────────────────────────────────────

/**
 * Orchestrates a full rating calculation for a week.
 *
 * Flow:
 * 1. Load week, rules, players, scores, events, professions (parallel)
 * 2. Build PlayerKpi[] via kpiEngine
 * 3. Pass all inputs into ratingEngine.computeRatings()
 * 4. Persist results, activate the new run
 * 5. Return summary
 */
export async function triggerRatingRun(
  weekId: number,
  triggeredBy = 'system',
  label?: string,
): Promise<TriggerRatingRunResult> {
  const week = await findWeekById(weekId)
  if (!week) throw new NotFoundError(`Week ${weekId} not found`)

  const runLabel = label ?? `Calcul automatique — ${week.label}`

  // ── Load all data in parallel ──────────────────────────────────────────────
  const [rules, players, scores, eventScores, professionLevels] = await Promise.all([
    loadActiveRatingRules(),
    findAllPlayers(),
    findScoresByWeek(weekId),
    aggregateEventScoresByDateRange(week.startDate, week.endDate),
    findAllProfessionLevels(),
  ])

  // ── Build KPIs (needed for vsScore + regularity computation) ──────────────
  const kpis = computeKpis({ players, currentScores: scores })

  if (kpis.length === 0) {
    throw new Error(`No scores found for week ${weekId} — cannot compute ratings`)
  }

  // ── Create a new run record ────────────────────────────────────────────────
  const run = await createRatingRun({
    label: runLabel,
    weekId,
    rulesSnapshot: rules,
    triggeredBy,
  })

  try {
    await setRatingRunStatus(run.id, 'running')

    // ── Compute ratings ──────────────────────────────────────────────────────
    const computed = computeRatings({
      kpis,
      rules,
      ratingRunId: run.id,
      eventScores:      eventScores.size > 0 ? eventScores : undefined,
      professionLevels: professionLevels.size > 0 ? professionLevels : undefined,
    })

    // ── Persist ───────────────────────────────────────────────────────────────
    await bulkUpsertPlayerRatings(run.id, computed)
    await setRatingRunStatus(run.id, 'completed', computed.length)
    await activateRatingRun(run.id, weekId)
    try {
      revalidateTag(`rating-${weekId}`, 'max')
    } catch {}

    // ── Build response ────────────────────────────────────────────────────────
    const playerMap = new Map(players.map((p) => [p.id, p.name]))

    return {
      runId:        run.id,
      weekId,
      rowsComputed: computed.length,
      finalScores: computed.map((r) => ({
        playerId:   r.playerId,
        playerName: playerMap.get(r.playerId) ?? `Player ${r.playerId}`,
        rank:       r.rank ?? 0,
        finalScore: r.finalScore ?? 0,
        components: {
          vsScore:         r.rawVsScore,
          regularity:      r.regularity,
          participation:   r.participation,
          eventScore:      r.eventScore,
          professionScore: r.professionScore,
          bonusMalus:      r.bonusMalus,
        },
      })),
    }
  } catch (err) {
    await setRatingRunStatus(run.id, 'failed')
    throw err
  }
}

// ─── Read current active ranking ─────────────────────────────────────────────

export async function getActiveRatingForWeek(
  weekId: number,
): Promise<PlayerRating[] | null> {
  if (IS_VERCEL_RUNTIME) return getActiveRatingForWeekCached(weekId)()
  if (!USE_NEXT_DATA_CACHE) return readActiveRatingForWeek(weekId)
  return getActiveRatingForWeekCached(weekId)()
}

async function readActiveRatingForWeek(weekId: number): Promise<PlayerRating[] | null> {
  const run = await findActiveRunForWeek(weekId)
  if (!run) return null
  return findPlayerRatingsByRun(run.id)
}

function getActiveRatingForWeekCached(weekId: number) {
  return unstable_cache(
    () => readActiveRatingForWeek(weekId),
    ['active-rating', String(weekId)],
    { revalidate: 120, tags: [`rating-${weekId}`] },
  )
}
