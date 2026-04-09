/**
 * Default configuration for the rating engine.
 *
 * These values seed the `rating_rules` table on first run.
 * Once seeded, the live values come from the DB and can be modified
 * by an admin without redeployment.
 *
 * Weight design:
 * - Active modules (VS score, regularity, participation) sum to 1.0
 * - Future modules (events, professions) have placeholder weights
 * - When a new module is activated, adjust weights so they still sum to 1.0
 *
 * Final score = Σ(component_score × weight) × 100, capped at 100.
 */

import type { RatingRules, RatingRuleKey } from '@/types/domain'

export const DEFAULT_RATING_RULES: RatingRules = {
  // Active now
  weightVsScore: 0.55,        // 55% — primary metric
  weightRegularity: 0.25,     // 25% — consistency over the week
  weightParticipation: 0.20,  // 20% — days played / 6

  // Future modules — weight is 0 until the module is activated
  weightEventScore: 0.00,
  weightProfessionScore: 0.00,

  // Multiplier: eco day scores are reduced in VS contribution
  ecoScoreMultiplier: 0.5,
} as const

/** Scale for the final score */
export const RATING_SCORE_SCALE = 100

/**
 * Human-readable labels and descriptions for each rule.
 * Used to seed the rating_rules table.
 */
export const RATING_RULE_META: Record<
  RatingRuleKey,
  { label: string; description: string }
> = {
  weight_vs_score: {
    label: 'Poids score VS',
    description: 'Part du score VS brut normalisé dans la note globale (0–1)',
  },
  weight_regularity: {
    label: 'Poids régularité',
    description: 'Part de la régularité journalière dans la note globale (0–1)',
  },
  weight_participation: {
    label: 'Poids participation',
    description: 'Part de la participation (jours joués / 6) dans la note globale (0–1)',
  },
  weight_event_score: {
    label: 'Poids événements',
    description: 'Part des performances en événements dans la note globale — module futur (0–1)',
  },
  weight_profession_score: {
    label: 'Poids profession',
    description: 'Part du niveau de profession dans la note globale — module futur (0–1)',
  },
  eco_score_multiplier: {
    label: 'Multiplicateur jour éco',
    description: 'Coefficient appliqué au score VS les jours classés "éco" (0–1)',
  },
}
