import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { email, recordId } = await req.json()
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, sessionToken: crypto.randomUUID() },
  })

  if (recordId) {
    await prisma.healthRecord.updateMany({
      where: { id: recordId },
      data: { userId: user.id },
    })
  }

  return NextResponse.json({ sessionToken: user.sessionToken })
}
