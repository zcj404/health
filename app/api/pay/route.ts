import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { sessionToken } = await req.json()
  if (!sessionToken) return NextResponse.json({ error: 'Missing sessionToken' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { sessionToken } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  await prisma.subscription.upsert({
    where: { userId: user.id },
    update: { status: 'active', activatedAt: new Date() },
    create: { userId: user.id, status: 'active', activatedAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
