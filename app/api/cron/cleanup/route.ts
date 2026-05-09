import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const { count } = await prisma.healthRecord.deleteMany({
    where: {
      status: 'in_progress',
      updatedAt: { lt: cutoff },
      user: { email: null },
    },
  })

  return NextResponse.json({ deleted: count })
}
