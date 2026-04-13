import { z } from 'zod'
import { PLAYER_RANKS } from '@/types/domain'

// ─── Primitives ───────────────────────────────────────────────────────────────

const playerName = z
  .string()
  .trim()
  .min(1, 'Le nom ne peut pas être vide')
  .max(100, 'Le nom ne peut pas dépasser 100 caractères')

const playerAlias = z
  .string()
  .trim()
  .max(100, "L'alias ne peut pas dépasser 100 caractères")
  .nullable()
  .optional()

const isoDate = z
  .string()
  .date('Format de date invalide (attendu : YYYY-MM-DD)')
  .nullable()
  .optional()

const playerRank = z
  .enum(['R1', 'R2', 'R3', 'R4', 'R5'])
  .nullable()
  .optional()

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const createPlayerSchema = z.object({
  name:        playerName,
  alias:       playerAlias,
  currentRank: playerRank,
  joinedAt:    isoDate,
})

export const updatePlayerSchema = z
  .object({
    name:          playerName.optional(),
    alias:         playerAlias,
    currentRank:   playerRank,
    suggestedRank: playerRank,
    rankReason:    z.string().max(500).nullable().optional(),
    isActive:      z.boolean().optional(),
    joinedAt:      isoDate,
    leftAt:        isoDate,
    generalLevel:  z.number().int().min(1).max(99).nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.joinedAt && data.leftAt) {
        return new Date(data.leftAt) > new Date(data.joinedAt)
      }
      return true
    },
    { message: 'leftAt doit être postérieur à joinedAt', path: ['leftAt'] },
  )

/**
 * Used during CSV import — all fields arrive as raw strings.
 *
 * Expected CSV columns:
 *   name          (required) — player in-game name
 *   current_rank  (optional) — R1..R5, blank = unclassified
 *   is_active     (optional) — TRUE/FALSE, blank = TRUE
 */
export const importPlayerRowSchema = z.object({
  name: playerName,
  current_rank: z
    .string()
    .trim()
    .toUpperCase()
    .refine(
      (v) => v === '' || (PLAYER_RANKS as string[]).includes(v),
      { message: 'Rang invalide — valeurs acceptées : R1, R2, R3, R4, R5' },
    )
    .optional(),
  is_active: z
    .string()
    .trim()
    .toUpperCase()
    .refine(
      (v) => v === '' || v === 'TRUE' || v === 'FALSE' || v === '1' || v === '0',
      { message: 'is_active invalide — valeurs acceptées : TRUE ou FALSE' },
    )
    .optional(),
})

// ─── Inferred types ───────────────────────────────────────────────────────────

export type CreatePlayerInput = z.infer<typeof createPlayerSchema>
export type UpdatePlayerInput = z.infer<typeof updatePlayerSchema>
export type ImportPlayerRow   = z.infer<typeof importPlayerRowSchema>
