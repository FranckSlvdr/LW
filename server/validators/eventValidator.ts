import { z } from 'zod'
import { MAX_PROFESSION_LEVEL } from '@/server/engines/ratingEngine'

const positiveId = z.number().int().positive()

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'eventDate doit être au format YYYY-MM-DD')
  .refine((s) => !isNaN(Date.parse(s)), 'eventDate invalide')

export const createEventSchema = z.object({
  playerId:     positiveId,
  eventName:    z.string().trim().min(1, 'eventName requis').max(100),
  eventDate:    isoDate,
  score:        z.number().int().min(0, 'Le score ne peut pas être négatif'),
  participated: z.boolean().default(true),
})

export const deleteEventSchema = z.object({
  id: positiveId,
})

export type CreateEventInput = z.infer<typeof createEventSchema>

// Re-export for convenience
export { MAX_PROFESSION_LEVEL }
