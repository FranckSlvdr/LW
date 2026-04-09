import { z } from 'zod'
import { MAX_PROFESSION_LEVEL } from '@/server/engines/ratingEngine'

const positiveId = z.number().int().positive()

/** Valid profession keys — extend as the game adds roles */
export const PROFESSION_KEYS = [
  'farmer',
  'fighter',
  'builder',
  'researcher',
  'explorer',
] as const

export type ProfessionKey = typeof PROFESSION_KEYS[number]

export const upsertProfessionSchema = z.object({
  playerId:      positiveId,
  professionKey: z.enum(PROFESSION_KEYS, {
    error: `Profession inconnue. Valeurs acceptées : ${PROFESSION_KEYS.join(', ')}`,
  }),
  level: z
    .number()
    .int()
    .min(1, 'level minimum : 1')
    .max(MAX_PROFESSION_LEVEL, `level maximum : ${MAX_PROFESSION_LEVEL}`),
})

export const deletePlayerProfessionSchema = z.object({
  playerId: positiveId,
})

export type UpsertProfessionInput = z.infer<typeof upsertProfessionSchema>
