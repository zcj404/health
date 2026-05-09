import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateBMI, calculateTargetCalories, calculateTargetDate } from '@/lib/calculations'
import { generateHealthPlan } from '@/lib/healthPlan'
import { StepData } from '@/types'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const record = await prisma.healthRecord.findUnique({ where: { id: params.id } })
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (record.status === 'completed') {
    return NextResponse.json({ bmi: record.bmi, targetCalories: record.targetCalories, targetDate: record.targetDate })
  }

  const d = record.stepData as StepData
  if (d.weight == null || d.height == null || d.age == null || !d.gender || !d.activityLevel || !d.goal) {
    return NextResponse.json({ error: 'Incomplete data' }, { status: 422 })
  }

  const bmi = calculateBMI(d.weight, d.height)
  const targetCalories = calculateTargetCalories(d.weight, d.height, d.age, d.gender, d.activityLevel, d.goal)
  const targetDate = d.targetWeight ? calculateTargetDate(d.weight, d.targetWeight) : null
  const healthPlan = generateHealthPlan(d, targetCalories)

  await prisma.healthRecord.update({
    where: { id: params.id },
    data: { status: 'completed', bmi, targetCalories, targetDate, healthPlan },
  })

  return NextResponse.json({ bmi, targetCalories, targetDate })
}
