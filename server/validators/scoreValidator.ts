import { z } from 'zod'

// ─── Primitives ───────────────────────────────────────────────────────────────

const dayOfWeek = z
  .number()
  .int()
  .min(1, 'dayOfWeek minimum : 1 (Lundi)')
  .max(6, 'dayOfWeek maximum : 6 (Samedi)')

const score = z
  .number()
  .int('Le score doit être un entier')
  .min(0, 'Le score ne peut pas être négatif')

const positiveId = z.number().int().positive()

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const upsertScoreSchema = z.object({
  playerId: positiveId,
  weekId: positiveId,
  dayOfWeek,
  score,
})

/** Bulk upsert — used by manual entry forms */
export const upsertScoresBulkSchema = z.object({
  weekId: positiveId,
  scores: z
    .array(
      z.object({
        playerId: positiveId,
        dayOfWeek,
        score,
      }),
    )
    .min(1, 'Au moins un score est requis')
    .max(600, 'Maximum 600 scores par requête (100 joueurs × 6 jours)'),
})

/**
 * CSV import row — all values arrive as strings from the CSV parser.
 * player_name is resolved to player_id in the service layer.
 */
export const importScoreRowSchema = z.object({
  player_name: z
    .string()
    .trim()
    .min(1, 'player_name est requis')
    .max(100),
  day_of_week: z
    .string()
    .regex(/^[1-6]$/, 'day_of_week doit être entre 1 et 6')
    .transform(Number),
  score: z
    .string()
    .regex(/^\d+$/, 'score doit être un entier positif')
    .transform(Number)
    .refine((n) => n >= 0, 'score ne peut pas être négatif'),
})

// ─── Inferred types ───────────────────────────────────────────────────────────

export type UpsertScoreInput = z.infer<typeof upsertScoreSchema>
export type UpsertScoresBulkInput = z.infer<typeof upsertScoresBulkSchema>
export type ImportScoreRow = z.infer<typeof importScoreRowSchema>
