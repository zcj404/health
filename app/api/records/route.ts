import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const sessionToken = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!sessionToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { sessionToken } })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const records = await prisma.healthRecord.findMany({
    where: { userId: user.id, status: 'completed' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, bmi: true, targetCalories: true, targetDate: true, createdAt: true },
  })

  return NextResponse.json(records)
}
