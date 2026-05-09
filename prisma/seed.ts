import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.create({
    data: { sessionToken: 'test-session-token-00000000-0000-0000-0000-000000000001' },
  })

  const assessment = await prisma.healthRecord.create({
    data: {
      userId: user.id,
      status: 'completed',
      stepData: {
        gender: 'female',
        goal: 'lose_weight',
        age: 28,
        height: 165,
        weight: 70,
        targetWeight: 60,
        activityLevel: 'moderate',
      },
      bmi: 25.7,
      targetCalories: 1950,
      targetDate: new Date(Date.now() + 154 * 24 * 60 * 60 * 1000),
    },
  })

  await prisma.subscription.create({
    data: { userId: user.id, status: 'free' },
  })

  console.log('Seed complete. Assessment ID:', assessment.id)
}

main().finally(() => prisma.$disconnect())
