import { z } from 'zod'

export const upsertVsDaySchema = z.object({
  weekId:     z.number().int().positive(),
  dayOfWeek:  z.number().int().min(1).max(6),
  isEco:      z.boolean(),
})

export type UpsertVsDayInput = z.infer<typeof upsertVsDaySchema>
