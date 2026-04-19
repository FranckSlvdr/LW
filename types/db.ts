/**
 * Raw database row types — mirror of the PostgreSQL schema (snake_case).
 *
 * These types are used exclusively in the repositories layer.
 * Never leak them to services, engines, or the frontend.
 * Repositories are responsible for mapping DB rows → domain types.
 *
 * BIGINT handling: the `postgres` npm client returns BIGINT as string.
 * Fields typed as `string` here that represent scores are converted to
 * `number` by the repository after a safe-integer check. See domain.ts
 * for the full BIGINT strategy documentation.
 */

export interface PlayerRow {
  id: number
  name: string
  normalized_name: string
  alias: string | null
  current_rank: string | null
  suggested_rank: string | null
  rank_reason: string | null
  joined_at: Date | null
  left_at: Date | null
  is_active: boolean
  general_level: number | null
  created_at: Date
  updated_at: Date
  // Optional: populated when findAllPlayers/findPlayerById LEFT JOINs player_professions
  profession_key?: string | null
  profession_level?: number | null
}

export interface WeekRow {
  id: number
  start_date: Date
  end_date: Date
  label: string
  is_locked: boolean
  created_at: Date
}

export interface DailyScoreRow {
  id: number
  player_id: number
  week_id: number
  day_of_week: number
  /** Returned as string by postgres client (BIGINT) — convert in repository */
  score: string
  is_eco: boolean
  source: string
  created_at: Date
  updated_at: Date
}

export interface VsDayRow {
  id: number
  week_id: number
  day_of_week: number
  is_eco: boolean
  updated_at: Date
}

export interface RatingRunRow {
  id: number
  label: string
  week_id: number
  rules_snapshot: string // JSONB parsed by postgres client
  status: string
  is_active: boolean
  triggered_by: string | null
  computed_at: Date
  rows_computed: number
}

export interface PlayerRatingRow {
  id: number
  player_id: number
  rating_run_id: number
  raw_vs_score: string | null  // NUMERIC → string, convert in repository
  regularity: string | null
  participation: string | null
  event_score: string | null
  profession_score: string | null
  bonus_malus: string
  final_score: string | null
  rank: number | null
  computed_at: Date
}

export interface RatingRuleRow {
  id: number
  rule_key: string
  label: string | null
  value: string // NUMERIC → string
  description: string | null
  is_active: boolean
  updated_at: Date
}

export interface ImportRow_DB {
  id: number
  import_type: string
  week_id: number | null
  filename: string | null
  status: string
  rows_total: number
  rows_imported: number
  rows_skipped: number
  errors_json: unknown | null // JSONB
  imported_by: string | null
  created_at: Date
}

export interface ImportRowDetailRow {
  id: number
  import_id: number
  row_number: number
  raw_data_json: unknown    // JSONB
  normalized_data_json: unknown | null // JSONB
  status: string
  error_message: string | null
  created_at: Date
}

export interface EventParticipationRow {
  id: number
  player_id: number
  event_name: string
  event_date: Date
  /** Returned as string by postgres client (BIGINT) */
  score: string
  participated: boolean
  created_at: Date
}

export interface PlayerProfessionRow {
  id: number
  player_id: number
  profession_key: string
  level: number
  updated_at: Date
}

export interface AuditLogRow {
  id: number
  entity_type: string
  entity_id: number | null
  action: string
  before_json: unknown | null // JSONB
  after_json: unknown | null  // JSONB
  performed_by: string | null
  created_at: Date
}

// ─── Analytics snapshot rows (migration 011) ──────────────────────────────────

export interface WeekKpiSnapshotRow {
  week_id: number
  payload: unknown      // DashboardSnapshot (JSONB — parsed as object by postgres.js)
  stale: boolean
  computed_at: Date
}

export interface WeekMemberStatsRow {
  week_id: number
  player_id: number
  player_name: string
  player_alias: string | null
  current_rank: string | null
  rank_position: number
  previous_rank: number | null
  rank_trend: string | null
  total_score: string   // BIGINT → string from postgres client
  raw_total_score: string
  days_played: number
  participation_rate: string  // NUMERIC → string
  daily_average: string
  eco_days: number
  daily_scores: unknown // DailyScoreApi[] (JSONB)
  computed_at: Date
}

export interface WeekRankStatsRow {
  week_id: number
  current_rank: string
  member_count: number
  active_count: number
  total_score: string   // BIGINT → string
  avg_score: string
  avg_participation: string  // NUMERIC → string
  avg_days_played: string
  computed_at: Date
}

// ─── Generic stats cache (migration 017) ─────────────────────────────────────

export interface StatsCacheRow {
  key: string
  payload: unknown  // typed at service layer (e.g. AllianceKpiStats)
  computed_at: Date
}
