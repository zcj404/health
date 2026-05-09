import { StepData } from '@/types'

export interface HealthPlan {
  [key: string]: string
  exercise: string
  diet: string
  sleep: string
}

export function generateHealthPlan(d: StepData, targetCalories: number): HealthPlan {
  const exerciseMap: Record<string, Record<string, string>> = {
    lose_weight: {
      sedentary: '每天快走30分钟，逐步增加至每周5次有氧运动',
      light: '每周3次有氧（慢跑/游泳）+ 2次力量训练',
      moderate: '每周4次有氧 + 3次力量训练，保持心率在目标区间',
      active: '每周5次混合训练，加入HIIT提升燃脂效率',
      very_active: '保持高强度训练，注意恢复，避免过度训练',
    },
    tone_up: {
      sedentary: '每周3次全身力量训练，从轻重量开始',
      light: '每周4次力量训练 + 2次有氧，专注复合动作',
      moderate: '每周5次训练，力量为主，有氧为辅',
      active: '每周6次训练，分肌群训练，注重肌肉刺激',
      very_active: '高频训练，精细化分化计划，确保充足恢复',
    },
    build_muscle: {
      sedentary: '每周3次全身力量训练，掌握基础动作',
      light: '每周4次力量训练，专注大肌群复合动作',
      moderate: '每周5次力量训练，渐进超负荷原则',
      active: '每周6次分化训练，保证蛋白质摄入',
      very_active: '高频大重量训练，充分睡眠促进肌肉合成',
    },
  }

  const goal = d.goal ?? 'lose_weight'
  const level = d.activityLevel ?? 'sedentary'
  const exercise = exerciseMap[goal]?.[level] ?? '每周3-5次运动，结合有氧与力量训练'

  let diet: string
  if (goal === 'lose_weight') {
    diet = `每日摄入 ${targetCalories} kcal，减少精制碳水，增加蔬菜和蛋白质，避免高糖饮料`
  } else if (goal === 'build_muscle') {
    diet = `每日摄入 ${targetCalories} kcal，蛋白质占比30%以上，每公斤体重摄入1.6-2g蛋白质`
  } else {
    diet = `每日摄入 ${targetCalories} kcal，均衡饮食，控制脂肪摄入，多摄入优质蛋白`
  }

  const age = Number(d.age ?? 25)
  let sleep: string
  if (age < 18) sleep = '每晚保证8-10小时睡眠，睡前避免使用电子设备'
  else if (age < 60) sleep = '每晚保证7-9小时睡眠，固定作息时间，睡前1小时避免强光'
  else sleep = '每晚保证7-8小时睡眠，可适当午休30分钟，保持规律作息'

  return { exercise, diet, sleep }
}
