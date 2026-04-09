import { z } from 'zod'

const isoDate = z.string().date('Format de date invalide (attendu : YYYY-MM-DD)')

export const createWeekSchema = z
  .object({
    startDate: isoDate,
    label: z.string().trim().max(50).optional(),
  })
  .transform((data) => ({
    ...data,
    // Ensure startDate is always a Monday (validated in service layer)
    startDate: data.startDate,
  }))

export const weekIdSchema = z
  .string()
  .regex(/^\d+$/, 'weekId must be a positive integer')
  .transform(Number)

export type CreateWeekInput = z.infer<typeof createWeekSchema>
