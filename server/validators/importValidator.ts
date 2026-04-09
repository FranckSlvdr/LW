import { z } from 'zod'

export const importTypeSchema = z.enum(['players', 'scores'])

export const importQuerySchema = z.object({
  weekId: z
    .string()
    .regex(/^\d+$/, 'weekId doit être un entier positif')
    .transform(Number)
    .optional(),
  type: importTypeSchema.optional(),
})

export const importRequestSchema = z.object({
  importType: importTypeSchema,
  weekId: z
    .string()
    .regex(/^\d+$/, 'weekId doit être un entier positif')
    .transform(Number)
    .optional(),
})

export type ImportTypeValue = z.infer<typeof importTypeSchema>
export type ImportRequestInput = z.infer<typeof importRequestSchema>
