/**
 * API contracts — shapes of requests and responses exchanged between
 * the Next.js Route Handlers and the frontend.
 *
 * These types are intentionally separate from domain types:
 * the API surface can evolve independently from internal models.
 */

import type { DayOfWeek, ImportStatus } from './domain'

// ─── VS Eco Days ───────────────────────────────────────────────────────────

export interface VsDayApi {
  id: number
  weekId: number
  dayOfWeek: DayOfWeek
  isEco: boolean
}

// ─── Envelope ──────────────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true
  data: T
}

export interface ApiError {
  success: false
  error: {
    code: string
    message: string
    /** Only populated in non-production environments */
    details?: unknown
  }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

// ─── KPI ───────────────────────────────────────────────────────────────────

export interface DailyScoreApi {
  dayOfWeek: DayOfWeek
  /** Raw score as entered/imported — never modified */
  score: number
  /** Score capped at ECO_SCORE_CAP when isEco=true, equals score otherwise */
  adjustedScore: number
  isEco: boolean
}

export interface PlayerKpi {
  playerId: number
  playerName: string
  playerAlias: string | null
  /** Sum of adjusted scores — used for all rankings and KPI calculations */
  totalScore: number
  /** Sum of raw scores — for display purposes */
  rawTotalScore: number
  daysPlayed: number
  /** 0–1 */
  participationRate: number
  dailyAverage: number
  rank: number
  previousRank: number | null
  rankTrend: 'up' | 'down' | 'stable' | null
  ecoDays: number
  dailyScores: DailyScoreApi[]
}

export interface WeekKpiSummary {
  weekId: number
  weekLabel: string
  totalPlayers: number
  /** Alliance total using adjusted scores — used by the app */
  globalTotalScore: number
  /** Alliance total using raw scores — for display only */
  globalRawTotalScore: number
  globalAverageScore: number
  topPlayers: PlayerKpi[]
  flopPlayers: PlayerKpi[]
  /** Comparison with the previous week, null if no previous week */
  vsLastWeek: WeekDelta | null
}

export interface WeekDelta {
  weekId: number
  weekLabel: string
  globalTotalScoreDelta: number
  participationDelta: number
}

// ─── Insights ──────────────────────────────────────────────────────────────

export type InsightType =
  | 'top_performer'
  | 'declining_player'
  | 'improving_player'
  | 'eco_day_pattern'
  | 'perfect_participation'
  | 'absent_player'
  | 'record_score'
  | 'week_over_week_improvement'

export interface Insight {
  id: string
  type: InsightType
  severity: 'info' | 'warning' | 'success' | 'alert'
  message: string
  affectedPlayerIds?: number[]
}

// ─── Ranking ───────────────────────────────────────────────────────────────

export interface RankedPlayer {
  playerId: number
  playerName: string
  playerAlias: string | null
  rank: number
  previousRank: number | null
  rankTrend: 'up' | 'down' | 'stable' | null
  finalScore: number
  /** Score components for transparency */
  components: {
    vsScore: number | null
    regularity: number | null
    participation: number | null
    eventScore: number | null
    professionScore: number | null
    bonusMalus: number
  }
}

// ─── Import ────────────────────────────────────────────────────────────────

export interface ImportPreview {
  importType: 'players' | 'scores'
  filename: string
  totalRows: number
  validRows: number
  duplicateRows: number
  errorRows: number
  errors: Array<{ row: number; field?: string; message: string }>
  /** Sample of parsed rows for user confirmation */
  preview: Record<string, unknown>[]
}

export interface ImportResult {
  importId: number
  status: ImportStatus
  rowsImported: number
  rowsSkipped: number
  errors: Array<{ row: number; field?: string; message: string }>
}

// ─── Players (API shapes) ───────────────────────────────────────────────────

export interface PlayerApi {
  id: number
  name: string
  alias: string | null
  currentRank: string | null
  suggestedRank: string | null
  rankReason: string | null
  isActive: boolean
  joinedAt: string | null
  leftAt: string | null
  generalLevel: number | null
  professionKey: string | null
  professionLevel: number | null
}

export interface CreatePlayerInput {
  name: string
  alias?: string
  joinedAt?: string
}

export interface UpdatePlayerInput {
  name?: string
  alias?: string
  isActive?: boolean
  joinedAt?: string
  leftAt?: string
}

// ─── Scores (API shapes) ────────────────────────────────────────────────────

export interface CreateScoreInput {
  playerId: number
  weekId: number
  dayOfWeek: DayOfWeek
  score: number
}

export type UpsertScoreInput = CreateScoreInput

// ─── Events (API shapes) ────────────────────────────────────────────────────

export interface EventApi {
  id: number
  playerId: number
  playerName: string
  eventName: string
  eventDate: string
  score: number
  participated: boolean
}

export interface CreateEventInput {
  playerId: number
  eventName: string
  eventDate: string  // ISO date string
  score: number
  participated?: boolean
}

// ─── Professions (API shapes) ────────────────────────────────────────────────

export interface ProfessionApi {
  id: number
  playerId: number
  playerName: string
  professionKey: string
  level: number
  updatedAt: string
}

export interface UpsertProfessionInput {
  playerId: number
  professionKey: string
  level: number
}

// ─── Rating (API shapes) ─────────────────────────────────────────────────────

export interface TriggerRatingRunResult {
  runId: number
  weekId: number
  rowsComputed: number
  finalScores: Array<{
    playerId: number
    playerName: string
    rank: number
    finalScore: number
    components: {
      vsScore: number | null
      regularity: number | null
      participation: number | null
      eventScore: number | null
      professionScore: number | null
      bonusMalus: number
    }
  }>
}

// ─── Desert Storm (API shapes) ──────────────────────────────────────────────

export interface DesertStormScoreApi {
  id: number
  playerId: number
  playerName: string
  playerAlias: string | null
  weekId: number
  score: number
  rank: number
}

export interface UpsertDesertStormInput {
  playerId: number
  weekId: number
  score: number
}

// ─── Contributions (API shapes) ──────────────────────────────────────────────

export interface ContributionApi {
  id: number
  playerId: number
  playerName: string
  playerAlias: string | null
  weekId: number
  amount: number
  note: string | null
  rank: number
}

export interface UpsertContributionInput {
  playerId: number
  weekId: number
  amount: number
  note?: string
}

// ─── Train settings (API shapes) ─────────────────────────────────────────────

export interface TrainSettingsApi {
  exclusionWindowWeeks: 0 | 1 | 2 | 3
  includeDsTop2: boolean
  includeBestContributor: boolean
  totalDriversPerDay: number
  vsTopCount: number
  vsTopDays: number[]
}

export interface UpdateTrainSettingsInput extends Partial<TrainSettingsApi> {
  vsTopCount?: number
  vsTopDays?: number[]
}

// ─── Train runs (API shapes) ─────────────────────────────────────────────────

export interface TrainRunApi {
  id: number
  weekId: number
  weekLabel: string
  trainDay: number
  trainDayLabel: string
  createdAt: string
  selections: TrainSelectionApi[]
  excludedPlayers: Array<{ playerId: number; playerName: string; weeksAgo: number }>
  settings: TrainSettingsApi
}

export interface TrainSelectionApi {
  position: number
  playerId: number
  playerName: string
  playerAlias: string | null
  selectionReason: 'ds_top_scorer' | 'best_contributor' | 'random' | 'manual'
}

export interface TriggerTrainRunInput {
  weekId: number
  trainDay: number
}

// ─── OCR (API shapes) ────────────────────────────────────────────────────────

export type OcrMatchType = 'exact' | 'alias' | 'fuzzy' | 'none'

export type OcrParseIssue =
  | 'low_confidence'
  | 'unresolved_player'
  | 'invalid_score'
  | 'possible_ocr_noise'
  | 'duplicate_row'
  | 'score_too_small'
  | 'merged_lines'
  | 'name_truncated'
  | 'ambiguous_player'

export interface OcrPlayerMatchApi {
  playerId: number
  playerName: string
  matchType: OcrMatchType
  confidence: number
}

export interface OcrParsedRowApi {
  rowIndex: number
  rawText: string
  extractedName: string
  extractedScore: number | null
  confidence: number
  issues: OcrParseIssue[]
  playerMatch: OcrPlayerMatchApi | null
  ocrCorrections: string[]
}

export interface OcrParseResultApi {
  profile: string
  rows: OcrParsedRowApi[]
  discarded: Array<{ lineIndex: number; text: string; reason: string }>
  /** Full active player list, for validation UI dropdowns */
  players: PlayerApi[]
  summary: {
    total: number
    highConfidence: number
    mediumConfidence: number
    lowConfidence: number
    unresolved: number
  }
}

export interface OcrConfirmRowInput {
  playerId: number
  score: number
}

export interface OcrConfirmInput {
  weekId: number
  dayOfWeek: number
  rows: OcrConfirmRowInput[]
}

// ─── Analytics (API shapes) ─────────────────────────────────────────────────

/**
 * Stored in week_kpi_snapshots.payload — locale-agnostic subset of DashboardData.
 * The insights field is intentionally absent; it's regenerated from allKpis
 * on each read so locale switching always produces correct messages.
 */
export interface DashboardSnapshot {
  summary: WeekKpiSummary
  allKpis: PlayerKpi[]
  /** Previous week KPIs — needed to generate rank-trend insights. Null for first week. */
  prevKpis: PlayerKpi[] | null
  /** playerId → alliance rank tier ('R1'..'R5' | null) at snapshot time */
  playerRanks: Record<number, string | null>
  /** Player count per generalLevel — pre-computed to avoid extra getAllPlayers() on dashboard */
  levelBuckets: Array<{ level: number; count: number }>
}

/** Aggregated VS-score stats for one alliance rank tier, for a given week. */
export interface WeekRankStatsApi {
  currentRank: string   // 'R5' | 'R4' | 'R3' | 'R2' | 'R1' | 'unranked'
  memberCount: number   // total players in this tier
  activeCount: number   // players with daysPlayed > 0
  totalScore: number
  avgScore: number      // totalScore / activeCount (0 if no active)
  avgParticipation: number  // 0–1
  avgDaysPlayed: number
}

// ─── Weeks (API shapes) ─────────────────────────────────────────────────────

export interface WeekApi {
  id: number
  startDate: string
  endDate: string
  label: string
  isLocked: boolean
}

export interface CreateWeekInput {
  startDate: string
  label?: string
}
