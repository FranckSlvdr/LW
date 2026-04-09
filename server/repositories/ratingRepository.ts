import 'server-only'
import { db } from '@/server/db/client'
import type { PlayerRatingRow, RatingRunRow, RatingRuleRow } from '@/types/db'
import type {
  PlayerRating,
  RatingRun,
  RatingRule,
  RatingRules,
  RatingRunStatus,
  RatingRuleKey,
} from '@/types/domain'

// ─── Mapping ──────────────────────────────────────────────────────────────────

function toRatingRun(row: RatingRunRow): RatingRun {
  return {
    id: row.id,
    label: row.label,
    weekId: row.week_id,
    rulesSnapshot: JSON.parse(row.rules_snapshot) as RatingRules,
    status: row.status as RatingRunStatus,
    isActive: row.is_active,
    triggeredBy: row.triggered_by,
    computedAt: row.computed_at,
    rowsComputed: row.rows_computed,
  }
}

function toPlayerRating(row: PlayerRatingRow): PlayerRating {
  const n = (v: string | null) => (v !== null ? Number(v) : null)
  return {
    id: row.id,
    playerId: row.player_id,
    ratingRunId: row.rating_run_id,
    rawVsScore: n(row.raw_vs_score),
    regularity: n(row.regularity),
    participation: n(row.participation),
    eventScore: n(row.event_score),
    professionScore: n(row.profession_score),
    bonusMalus: Number(row.bonus_malus),
    finalScore: n(row.final_score),
    rank: row.rank,
    computedAt: row.computed_at,
  }
}

function toRatingRule(row: RatingRuleRow): RatingRule {
  return {
    id: row.id,
    ruleKey: row.rule_key as RatingRuleKey,
    label: row.label,
    value: Number(row.value),
    description: row.description,
    isActive: row.is_active,
    updatedAt: row.updated_at,
  }
}

// ─── Rating Rules ─────────────────────────────────────────────────────────────

export async function findAllRatingRules(): Promise<RatingRule[]> {
  const rows = await db<RatingRuleRow[]>`
    SELECT * FROM rating_rules ORDER BY rule_key ASC
  `
  return rows.map(toRatingRule)
}

/**
 * Reads active rating rules from DB and returns them as a RatingRules object.
 * Falls back to DEFAULT_RATING_RULES if the table is empty.
 */
export async function loadActiveRatingRules(): Promise<RatingRules> {
  const { DEFAULT_RATING_RULES } = await import('@/config/rating.config')
  const rows = await db<RatingRuleRow[]>`
    SELECT * FROM rating_rules WHERE is_active = TRUE
  `
  if (rows.length === 0) return DEFAULT_RATING_RULES

  const map = Object.fromEntries(rows.map((r) => [r.rule_key, Number(r.value)]))

  return {
    weightVsScore:        map['weight_vs_score']        ?? DEFAULT_RATING_RULES.weightVsScore,
    weightRegularity:     map['weight_regularity']      ?? DEFAULT_RATING_RULES.weightRegularity,
    weightParticipation:  map['weight_participation']   ?? DEFAULT_RATING_RULES.weightParticipation,
    weightEventScore:     map['weight_event_score']     ?? DEFAULT_RATING_RULES.weightEventScore,
    weightProfessionScore:map['weight_profession_score']?? DEFAULT_RATING_RULES.weightProfessionScore,
    ecoScoreMultiplier:   map['eco_score_multiplier']   ?? DEFAULT_RATING_RULES.ecoScoreMultiplier,
  }
}

export async function updateRatingRule(
  ruleKey: RatingRuleKey,
  value: number,
): Promise<RatingRule | null> {
  const rows = await db<RatingRuleRow[]>`
    UPDATE rating_rules
    SET value = ${value}, updated_at = NOW()
    WHERE rule_key = ${ruleKey}
    RETURNING *
  `
  return rows[0] ? toRatingRule(rows[0]) : null
}

// ─── Rating Runs ──────────────────────────────────────────────────────────────

export async function findActiveRunForWeek(weekId: number): Promise<RatingRun | null> {
  const rows = await db<RatingRunRow[]>`
    SELECT * FROM rating_runs
    WHERE week_id = ${weekId} AND is_active = TRUE
    LIMIT 1
  `
  return rows[0] ? toRatingRun(rows[0]) : null
}

export async function findRunsByWeek(weekId: number): Promise<RatingRun[]> {
  const rows = await db<RatingRunRow[]>`
    SELECT * FROM rating_runs
    WHERE week_id = ${weekId}
    ORDER BY computed_at DESC
  `
  return rows.map(toRatingRun)
}

export async function createRatingRun(data: {
  label: string
  weekId: number
  rulesSnapshot: RatingRules
  triggeredBy?: string
}): Promise<RatingRun> {
  const rows = await db<RatingRunRow[]>`
    INSERT INTO rating_runs (label, week_id, rules_snapshot, triggered_by)
    VALUES (
      ${data.label},
      ${data.weekId},
      ${db.json(data.rulesSnapshot as never)},
      ${data.triggeredBy ?? null}
    )
    RETURNING *
  `
  return toRatingRun(rows[0])
}

export async function setRatingRunStatus(
  runId: number,
  status: RatingRunStatus,
  rowsComputed?: number,
): Promise<void> {
  await db`
    UPDATE rating_runs
    SET
      status        = ${status},
      rows_computed = COALESCE(${rowsComputed ?? null}, rows_computed),
      computed_at   = NOW()
    WHERE id = ${runId}
  `
}

/** Marks a run as the active one for its week, deactivates all others */
export async function activateRatingRun(runId: number, weekId: number): Promise<void> {
  await db.begin(async (tx) => {
    await tx`
      UPDATE rating_runs SET is_active = FALSE WHERE week_id = ${weekId}
    `
    await tx`
      UPDATE rating_runs SET is_active = TRUE WHERE id = ${runId}
    `
  })
}

// ─── Player Ratings ──────────────────────────────────────────────────────────

export async function findPlayerRatingsByRun(runId: number): Promise<PlayerRating[]> {
  const rows = await db<PlayerRatingRow[]>`
    SELECT * FROM player_ratings
    WHERE rating_run_id = ${runId}
    ORDER BY rank ASC NULLS LAST
  `
  return rows.map(toPlayerRating)
}

/** Bulk insert computed ratings — replaces any existing entries for this run */
export async function bulkUpsertPlayerRatings(
  runId: number,
  ratings: Array<Omit<PlayerRating, 'id' | 'computedAt'>>,
): Promise<void> {
  if (ratings.length === 0) return

  const records = ratings.map((r) => ({
    player_id:        r.playerId,
    rating_run_id:    runId,
    raw_vs_score:     r.rawVsScore,
    regularity:       r.regularity,
    participation:    r.participation,
    event_score:      r.eventScore,
    profession_score: r.professionScore,
    bonus_malus:      r.bonusMalus,
    final_score:      r.finalScore,
    rank:             r.rank,
  }))

  await db`
    INSERT INTO player_ratings
      ${db(records, 'player_id', 'rating_run_id', 'raw_vs_score', 'regularity',
           'participation', 'event_score', 'profession_score', 'bonus_malus',
           'final_score', 'rank')}
    ON CONFLICT (player_id, rating_run_id)
    DO UPDATE SET
      raw_vs_score     = EXCLUDED.raw_vs_score,
      regularity       = EXCLUDED.regularity,
      participation    = EXCLUDED.participation,
      event_score      = EXCLUDED.event_score,
      profession_score = EXCLUDED.profession_score,
      bonus_malus      = EXCLUDED.bonus_malus,
      final_score      = EXCLUDED.final_score,
      rank             = EXCLUDED.rank,
      computed_at      = NOW()
  `
}
