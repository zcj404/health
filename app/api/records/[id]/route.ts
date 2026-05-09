import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { StepData } from '@/types'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionToken = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!sessionToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { sessionToken } })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const record = await prisma.healthRecord.findUnique({ where: { id: params.id } })
  if (!record || record.userId !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (record.status === 'completed') return NextResponse.json({ error: 'Cannot modify completed record' }, { status: 403 })

  const body = await req.json()
  const updated = await prisma.healthRecord.update({
    where: { id: params.id },
    data: { stepData: { ...(record.stepData as object), ...body } },
  })

  return NextResponse.json({ id: updated.id, stepData: updated.stepData })
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionToken = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!sessionToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { sessionToken } })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const record = await prisma.healthRecord.findUnique({ where: { id: params.id } })
  if (!record || record.userId !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (record.status !== 'completed') return NextResponse.json({ error: 'Not completed' }, { status: 422 })

  const subscription = await prisma.subscription.findUnique({ where: { userId: user.id } })
  const isPaid = subscription?.status === 'active'
  const d = record.stepData as StepData

  const base = {
    bmi: record.bmi,
    targetCalories: record.targetCalories,
    targetDate: record.targetDate,
  }

  if (isPaid) {
    return NextResponse.json({
      ...base,
      currentWeight: d.weight,
      targetWeight: d.targetWeight,
      healthPlan: record.healthPlan,
    })
  }

  return NextResponse.json({ ...base, preview: true })
}
