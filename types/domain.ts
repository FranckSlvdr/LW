/**
 * Core domain types â€” source of truth for the business domain.
 * These types are shared across client and server.
 * No runtime dependencies â€” pure TypeScript interfaces.
 *
 * â”€â”€â”€ BIGINT STRATEGY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Last War VS scores are stored as BIGINT in PostgreSQL. The `postgres` npm
 * client returns BIGINT columns as `string` by default to avoid JS precision
 * loss (Number.MAX_SAFE_INTEGER â‰ˆ 9 quadrillion â€” scores are unlikely to
 * exceed this, but we normalize defensively).
 *
 * Strategy: the DB layer (repositories) converts BIGINT strings to `number`
 * via `Number()` after asserting the value is within safe range. If a score
 * ever exceeds Number.MAX_SAFE_INTEGER, we switch to `bigint` in that layer
 * only â€” the rest of the app stays on `number`. Score fields in these types
 * are declared as `number` with this guarantee in mind.
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 */

// â”€â”€â”€ Primitives â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Monday=1, Tuesday=2, â€¦, Saturday=6 */
export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6

export type ImportSource = 'manual' | 'csv' | 'ocr'
export type ImportStatus = 'pending' | 'success' | 'partial' | 'error'
export type ImportRowStatus = 'imported' | 'skipped' | 'error'
export type ImportType = 'players' | 'scores'
export type RatingRunStatus = 'pending' | 'running' | 'completed' | 'failed'
export type AuditAction =
  | 'CREATE' | 'UPDATE' | 'DELETE'
  | 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED'
  | 'INVITE_SENT' | 'INVITE_ACCEPTED'
  | 'PASSWORD_RESET_REQUESTED' | 'PASSWORD_RESET_COMPLETED'
  | 'USER_DEACTIVATED' | 'USER_ACTIVATED'
  | 'ROLE_CHANGED'

// â”€â”€â”€ Auth & Permissions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type UserRole = 'super_admin' | 'admin' | 'manager' | 'viewer'

/**
 * All protected actions in the system.
 * Format: '<resource>:<action>'
 * Used by authGuard to enforce role-based access control.
 */
export type Permission =
  // Read access
  | 'dashboard:view'
  | 'audit:view'
  | 'admin:view'
  // Import operations
  | 'players:import'
  | 'scores:import'
  // Week management
  | 'weeks:manage'          // create, update, lock weeks
  // Edit operations
  | 'players:manage'       // create, update, deactivate
  | 'scores:edit'          // manual score entry or correction
  // Train operations
  | 'trains:trigger'       // run full-week train selection
  | 'trains:configure'     // modify train settings
  // Rating & config
  | 'rating:configure'     // modify rating_rules weights
  | 'rating:recalculate'   // trigger a new rating run
  // User management
  | 'users:invite'         // send invite emails
  | 'users:manage'         // activate/deactivate users
  | 'users:promote_admin'  // elevate to admin / super_admin
  // Settings
  | 'settings:configure'   // application-level settings

export interface AuthUser {
  id: string
  role: UserRole
  name: string
  email: string
  tokenVersion: number
}

// â”€â”€â”€ Players â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Alliance rank system.
 * R5 = Leader Â· R4 = Officers Â· R3 = Active Â· R2 = Occasional Â· R1 = Inactive/review
 */
export type PlayerRank = 'R1' | 'R2' | 'R3' | 'R4' | 'R5'

export const PLAYER_RANKS: PlayerRank[] = ['R1', 'R2', 'R3', 'R4', 'R5']

export const RANK_LABEL: Record<PlayerRank, string> = {
  R5: 'R5 \u2014 Leader',
  R4: 'R4 \u2014 Officier',
  R3: 'R3 \u2014 Membre actif',
  R2: 'R2 \u2014 Membre occasionnel',
  R1: 'R1 \u2014 Inactif / \u00C0 revoir',
}

export interface Player {
  id: number
  name: string
  /** Lowercase, no diacritics, no special chars â€” used for dedup and OCR matching */
  normalizedName: string
  /** Optional in-game alias â€” internal only, used for OCR score matching */
  alias: string | null
  /**
   * Rank actually assigned by leadership.
   * null = unclassified (newly imported player).
   */
  currentRank: PlayerRank | null
  /**
   * Rank recommended by the app engine based on activity signals.
   * null = no recommendation computed yet.
   */
  suggestedRank: PlayerRank | null
  /** Short explanation for why suggestedRank was assigned. */
  rankReason: string | null
  /** When the player joined the alliance */
  joinedAt: Date | null
  /** When the player left the alliance (null = still active) */
  leftAt: Date | null
  isActive: boolean
  /** Player's overall in-game level (manually set) */
  generalLevel: number | null
  /** Active profession key â€” null if no profession recorded */
  professionKey: string | null
  /** Profession level (1â€“10) â€” null if no profession recorded */
  professionLevel: number | null
  createdAt: Date
  updatedAt: Date
}

// â”€â”€â”€ VS Weeks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface Week {
  id: number
  /** Always a Monday */
  startDate: Date
  /** Always a Saturday */
  endDate: Date
  /** Human label, e.g. "Semaine 14 Â· 2025" */
  label: string
  /** Locked weeks cannot be modified */
  isLocked: boolean
  createdAt: Date
}

// â”€â”€â”€ VS Eco Days â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Alliance-level eco day flag for a VS week.
 * When a day is marked eco, all player scores are capped at ECO_SCORE_CAP
 * for calculation purposes. Raw scores in daily_scores are never modified.
 */
export interface VsDay {
  id: number
  weekId: number
  dayOfWeek: DayOfWeek
  isEco: boolean
  updatedAt: Date
}

// â”€â”€â”€ Daily Scores â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface DailyScore {
  id: number
  playerId: number
  weekId: number
  dayOfWeek: DayOfWeek
  score: number
  isEco: boolean
  source: ImportSource
  createdAt: Date
  updatedAt: Date
}

// â”€â”€â”€ Rating System â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * A rating run is a versioned snapshot of a rating calculation.
 * Multiple runs can exist per week; only one is "active" at a time.
 * This allows recalculating with different rules without losing history.
 */
export interface RatingRun {
  id: number
  label: string
  weekId: number
  /** Snapshot of rating_rules values at computation time */
  rulesSnapshot: RatingRules
  status: RatingRunStatus
  /** Only one run per week should be active */
  isActive: boolean
  triggeredBy: string | null
  computedAt: Date
  rowsComputed: number
}

/**
 * A player's computed rating for a specific rating run.
 * Each component is stored separately for auditability and debugging.
 */
export interface PlayerRating {
  id: number
  playerId: number
  ratingRunId: number
  /** Normalized VS score component (0â€“1) */
  rawVsScore: number | null
  /** Regularity component: low variance = high score (0â€“1) */
  regularity: number | null
  /** Participation: days played / 6 (0â€“1) */
  participation: number | null
  /** Event performance â€” null until events module is active */
  eventScore: number | null
  /** Profession level â€” null until professions module is active */
  professionScore: number | null
  /** Manual bonus or malus applied by admin */
  bonusMalus: number
  /** Final weighted score, scaled 0â€“100 */
  finalScore: number | null
  rank: number | null
  computedAt: Date
}

/**
 * Configurable weights for the rating engine.
 * Stored in DB (rating_rules table) â€” modifiable without deployment.
 * All weights should sum to 1.0 when all modules are active.
 */
export interface RatingRules {
  weightVsScore: number
  weightRegularity: number
  weightParticipation: number
  weightEventScore: number
  weightProfessionScore: number
  /** Multiplier applied to scores on eco days */
  ecoScoreMultiplier: number
}

/**
 * Known rule keys stored in the rating_rules table.
 * Typed as a union to prevent typos throughout the codebase.
 * Extend this union when adding new scoring dimensions.
 */
export type RatingRuleKey =
  | 'weight_vs_score'
  | 'weight_regularity'
  | 'weight_participation'
  | 'weight_event_score'
  | 'weight_profession_score'
  | 'eco_score_multiplier'

/** A single configurable rule stored in the database */
export interface RatingRule {
  id: number
  ruleKey: RatingRuleKey
  label: string | null
  value: number
  description: string | null
  isActive: boolean
  updatedAt: Date
}

// â”€â”€â”€ Imports â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface Import {
  id: number
  importType: ImportType
  weekId: number | null
  filename: string | null
  status: ImportStatus
  rowsTotal: number
  rowsImported: number
  rowsSkipped: number
  errorsJson: ImportError[] | null
  importedBy: string | null
  createdAt: Date
}

export interface ImportRow {
  id: number
  importId: number
  rowNumber: number
  rawDataJson: Record<string, unknown>
  normalizedDataJson: Record<string, unknown> | null
  status: ImportRowStatus
  errorMessage: string | null
  createdAt: Date
}

export interface ImportError {
  row: number
  field?: string
  message: string
}

// â”€â”€â”€ Desert Storm â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface DesertStormScore {
  id: number
  playerId: number
  weekId: number
  score: number
  createdAt: Date
  updatedAt: Date
}

// â”€â”€â”€ Contributions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface Contribution {
  id: number
  playerId: number
  weekId: number
  amount: number
  note: string | null
  createdAt: Date
  updatedAt: Date
}

// â”€â”€â”€ Train system â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type SelectionReason = 'ds_top_scorer' | 'best_contributor' | 'random' | 'manual'

/** Monday=1 â€¦ Sunday=7 */
export type TrainDay = 1 | 2 | 3 | 4 | 5 | 6 | 7

export interface TrainSettings {
  id: number
  /** How many previous weeks to look back for exclusions (0 = no exclusion) */
  exclusionWindowWeeks: 0 | 1 | 2 | 3
  /** Reserve a slot for the top 2 Desert Storm scorers of the week */
  includeDsTop2: boolean
  /** Reserve a slot for the player with the highest contribution */
  includeBestContributor: boolean
  /** Total train driver slots to fill per day */
  totalDriversPerDay: number
  /** Restrict the eligible pool to the top N VS scorers of the previous week (0 = disabled) */
  vsTopCount: number
  /** Which VS days to consider (empty = all days = use total score) */
  vsTopDays: number[]
  updatedAt: Date
}

export interface TrainRun {
  id: number
  weekId: number
  trainDay: TrainDay
  settingsSnapshot: Omit<TrainSettings, 'id' | 'updatedAt'>
  excludedPlayerIds: Array<{ playerId: number; weeksAgo: number }>
  createdAt: Date
}

export interface TrainSelection {
  id: number
  runId: number
  playerId: number
  position: number
  selectionReason: SelectionReason
}

// â”€â”€â”€ Future modules (stubs â€” types defined now, tables exist) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface EventParticipation {
  id: number
  playerId: number
  eventName: string
  eventDate: Date
  score: number
  participated: boolean
  createdAt: Date
}

export interface PlayerProfession {
  id: number
  playerId: number
  /** e.g. 'farmer' | 'fighter' | 'builder' */
  professionKey: string
  level: number
  updatedAt: Date
}

// â”€â”€â”€ Audit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Auditable domain entities â€” extend when adding new modules */
export type AuditEntityType =
  | 'player'
  | 'week'
  | 'daily_score'
  | 'rating_rule'
  | 'rating_run'
  | 'import'
  | 'user'

export interface AuditLog {
  id: number
  entityType: AuditEntityType
  entityId: number | null
  action: AuditAction
  beforeJson: Record<string, unknown> | null
  afterJson: Record<string, unknown> | null
  performedBy: string | null
  userId: string | null
  userEmail: string | null
  ipAddress: string | null
  createdAt: Date
}

// â”€â”€â”€ User management â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface UserCredentials {
  userId: string
  passwordHash: string | null
  tokenVersion: number
  inviteTokenHash: string | null
  inviteExpiresAt: Date | null
  inviteAccepted: boolean
  resetTokenHash: string | null
  resetExpiresAt: Date | null
  createdAt: Date
  updatedAt: Date
}
