const ACTIVITY_FACTORS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

export function calculateBMI(weight: number, height: number) {
  return Math.round((weight / Math.pow(height / 100, 2)) * 10) / 10
}

export function calculateTargetCalories(
  weight: number,
  height: number,
  age: number,
  gender: string,
  activityLevel: string,
  goal: string
) {
  const bmr = 10 * weight + 6.25 * height - 5 * age + (gender === 'male' ? 5 : -161)
  const tdee = bmr * (ACTIVITY_FACTORS[activityLevel] ?? 1.2)

  if (goal === 'lose_weight') return Math.round(tdee - 500)
  if (goal === 'build_muscle') return Math.round(tdee + 400)
  return Math.round(tdee)
}

export function calculateTargetDate(weight: number, targetWeight: number): Date | null {
  if (targetWeight >= weight) return null
  const daysNeeded = Math.round(((weight - targetWeight) * 7700) / 500)
  const date = new Date()
  date.setDate(date.getDate() + daysNeeded)
  return date
}
