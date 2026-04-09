import { z } from 'zod'

const VALID_RULE_KEYS = [
  'weight_vs_score',
  'weight_regularity',
  'weight_participation',
  'weight_event_score',
  'weight_profession_score',
  'eco_score_multiplier',
] as const

/** Validates a request to update a single rating rule value */
export const updateRatingRuleSchema = z.object({
  ruleKey: z.enum(VALID_RULE_KEYS),
  value: z
    .number()
    .min(0, 'La valeur ne peut pas être négative')
    .max(1, 'La valeur ne peut pas dépasser 1'),
})

/** Validates a request to trigger a new rating run */
export const triggerRatingRunSchema = z.object({
  weekId: z.number().int().positive('weekId doit être positif'),
  label: z.string().trim().max(100).optional(),
})

export type UpdateRatingRuleInput = z.infer<typeof updateRatingRuleSchema>
export type TriggerRatingRunInput = z.infer<typeof triggerRatingRunSchema>
