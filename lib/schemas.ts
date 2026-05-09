import { z } from 'zod'

export const sessionSchema = z.object({
  sessionToken: z.string().uuid().optional(),
})

export const stepDataSchema = z.object({
  gender: z.enum(['male', 'female']).optional(),
  goal: z.enum(['lose_weight', 'tone_up', 'build_muscle']).optional(),
  age: z.number().int().min(10).max(100).optional(),
  height: z.number().min(50).max(250).optional(),
  weight: z.number().min(20).max(300).optional(),
  targetWeight: z.number().min(20).max(300).optional(),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']).optional(),
})

export const paySchema = z.object({
  sessionToken: z.string().uuid(),
})
