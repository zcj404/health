export interface StepData {
  gender?: 'male' | 'female'
  goal?: 'lose_weight' | 'tone_up' | 'build_muscle'
  age?: number
  height?: number
  weight?: number
  targetWeight?: number
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
}

export interface AssessmentResult {
  bmi: number
  targetCalories?: number
  targetDate?: string | null
  preview?: boolean
  message?: string
}
