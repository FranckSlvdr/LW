/**
 * API contracts â€” shapes of requests and responses exchanged between
 * the Next.js Route Handlers and the frontend.
 *
 * These types are intentionally separate from domain types:
 * the API surface can evolve independently from internal models.
 */

import type { DayOfWeek, ImportStatus } from './domain'

// â”€â”€â”€ VS Eco Days â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface VsDayApi {
  id: number
  weekId: number
  dayOfWeek: DayOfWeek
  isEco: boolean
}

// â”€â”€â”€ Envelope â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ KPI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface DailyScoreApi {
  dayOfWeek: DayOfWeek
  /** Raw score as entered/imported â€” never modified */
  score: number
  /** Score capped at ECO_SCORE_CAP when isEco=true, equals score otherwise */
  adjustedScore: number
  isEco: boolean
}

export interface PlayerKpi {
  playerId: number
  playerName: string
  playerAlias: string | null
  /** Sum of adjusted scores â€” used for all rankings and KPI calculations */
  totalScore: number
  /** Sum of raw scores â€” for display purposes */
  rawTotalScore: number
  daysPlayed: number
  /** 0â€“1 */
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
  /** Alliance total using adjusted scores â€” used by the app */
  globalTotalScore: number
  /** Alliance total using raw scores â€” for display only */
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

// â”€â”€â”€ Insights â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Ranking â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Import â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Players (API shapes) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Scores (API shapes) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface CreateScoreInput {
  playerId: number
  weekId: number
  dayOfWeek: DayOfWeek
  score: number
}

export type UpsertScoreInput = CreateScoreInput

// â”€â”€â”€ Events (API shapes) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Professions (API shapes) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Rating (API shapes) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Desert Storm (API shapes) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Legacy: conserve pour la compatibilite avec la selection des trains. */
export interface DesertStormScoreApi {
  id: number
  playerId: number
  playerName: string
  playerAlias: string | null
  weekId: number
  score: number
  rank: number
}

/** Legacy: conserve pour la compatibilite avec la selection des trains. */
export interface UpsertDesertStormInput {
  playerId: number
  weekId: number
  score: number
}

// Desert Storm registrations (nouveau modele par equipes)

export type DsTeam = 'A' | 'B'
export type DsRole = 'titulaire' | 'rempla\u00E7ant'

export interface DsRegistrationApi {
  id: number
  weekId: number
  playerId: number
  playerName: string
  playerAlias: string | null
  team: DsTeam
  role: DsRole
  present: boolean
  top3Rank: 1 | 2 | 3 | null
}

export interface UpsertDsRegistrationInput {
  playerId: number
  weekId: number
  team: DsTeam
  role: DsRole
  present: boolean
  top3Rank: 1 | 2 | 3 | null
}

// â”€â”€â”€ Contributions (API shapes) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Train settings (API shapes) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Train runs (API shapes) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ OCR (API shapes) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Analytics (API shapes) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Stored in week_kpi_snapshots.payload â€” locale-agnostic subset of DashboardData.
 * The insights field is intentionally absent; it's regenerated from allKpis
 * on each read so locale switching always produces correct messages.
 */
export interface DashboardSnapshot {
  summary: WeekKpiSummary
  allKpis: PlayerKpi[]
  /** Previous week KPIs â€” needed to generate rank-trend insights. Null for first week. */
  prevKpis: PlayerKpi[] | null
  /** playerId â†’ alliance rank tier ('R1'..'R5' | null) at snapshot time */
  playerRanks: Record<number, string | null>
  /** Player count per generalLevel â€” pre-computed to avoid extra getAllPlayers() on dashboard */
  levelBuckets: Array<{ level: number; count: number }>
}

/** Aggregated VS-score stats for one alliance rank tier, for a given week. */
export interface WeekRankStatsApi {
  currentRank: string   // 'R5' | 'R4' | 'R3' | 'R2' | 'R1' | 'unranked'
  memberCount: number   // total players in this tier
  activeCount: number   // players with daysPlayed > 0
  totalScore: number
  avgScore: number      // totalScore / activeCount (0 if no active)
  avgParticipation: number  // 0â€“1
  avgDaysPlayed: number
}

// â”€â”€â”€ Weeks (API shapes) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// ─── Alliance KPI stats (cross-week, computed daily by cron) ─────────────────

/** One player entry in a ranking panel (top/flop/absent/DS). */
export interface AlliancePlayerEntry {
  playerId: number
  playerName: string
  playerAlias: string | null
  /** Primary value: totalScore (top/flop), daysPlayed (absent), dsCount (DS). */
  value: number
  /** Secondary context: daysPlayed (top/flop), maxDays (absent), weeksTotal (DS). */
  extra: number
}

/** One week's alliance aggregate for the trend table. */
export interface AllianceWeekEntry {
  weekLabel: string
  totalScore: number
  activePlayers: number
  avgScore: number
}

/**
 * Full cross-week alliance stats snapshot.
 * Computed daily by the `compute-alliance-stats` cron and stored in stats_cache.
 */
export interface AllianceKpiStats {
  computedAt: string
  weeksConsidered: number
  weekLabels: string[]             // chronological order (oldest → newest)
  topVS: AlliancePlayerEntry[]     // top 3 by cumulative totalScore
  flopVS: AlliancePlayerEntry[]    // bottom 3 by cumulative totalScore (played ≥ 1 day)
  mostAbsent: AlliancePlayerEntry[] // 3 most absent (fewest daysPlayed)
  leastDS: AlliancePlayerEntry[]   // 3 least registered in Desert Storm
  perfectAttendance: AlliancePlayerEntry[] // 6/6 all weeks (value = weeksPresent)
  weeklyTotals: AllianceWeekEntry[]        // oldest → newest
  avgParticipation4w: number   // 0–1 across all active players × weeks
  globalAvgScore4w: number     // avg score per active player-week
  totalScore4w: number         // alliance cumulative score across 4 weeks
}

