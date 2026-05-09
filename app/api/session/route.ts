import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sessionSchema } from '@/lib/schemas'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const parsed = sessionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const token = parsed.data.sessionToken ?? randomUUID()

  const user = await prisma.user.upsert({
    where: { sessionToken: token },
    update: {},
    create: { sessionToken: token },
  })

  let record = await prisma.healthRecord.findFirst({
    where: { userId: user.id, status: 'in_progress' },
    orderBy: { createdAt: 'desc' },
  })

  if (!record) {
    record = await prisma.healthRecord.create({ data: { userId: user.id } })
  }

  return NextResponse.json({
    sessionToken: token,
    userId: user.id,
    recordId: record.id,
    completed: false,
    progress: record.stepData,
  })
}
