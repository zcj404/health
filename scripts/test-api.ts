/**
 * API 测试脚本
 * 测试所有接口的正常流程、边界情况、错误处理
 *
 * 运行方式：
 * npx tsx scripts/test-api.ts
 */

const BASE_URL = 'http://localhost:3000'

interface TestResult {
  name: string
  passed: boolean
  error?: string
  duration: number
}

const results: TestResult[] = []

// 辅助函数
async function test(name: string, fn: () => Promise<void>) {
  const start = Date.now()
  try {
    await fn()
    results.push({ name, passed: true, duration: Date.now() - start })
    console.log(`✅ ${name}`)
  } catch (error) {
    results.push({ name, passed: false, error: String(error), duration: Date.now() - start })
    console.log(`❌ ${name}`)
    console.log(`   ${error}`)
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

// 全局变量存储测试数据
let sessionToken: string
let recordId: string
let userEmail: string

console.log('🚀 开始 API 测试...\n')

// ============================================
// 第一部分：会话管理测试
// ============================================
console.log('📦 测试组 1: 会话管理\n')

await test('1.1 创建新会话', async () => {
  const res = await fetch(`${BASE_URL}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  assert(res.ok, `状态码 ${res.status}`)

  const data = await res.json()
  assert(data.sessionToken, '缺少 sessionToken')
  assert(data.recordId, '缺少 recordId')
  assert(data.completed === false, 'completed 应为 false')

  sessionToken = data.sessionToken
  recordId = data.recordId
})

await test('1.2 恢复已有会话', async () => {
  const res = await fetch(`${BASE_URL}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionToken }),
  })
  assert(res.ok, `状态码 ${res.status}`)

  const data = await res.json()
  assert(data.recordId === recordId, '应返回同一个 recordId')
})

// ============================================
// 第二部分：分步保存测试
// ============================================
console.log('\n📦 测试组 2: 分步保存\n')

await test('2.1 保存第一步（性别）', async () => {
  const res = await fetch(`${BASE_URL}/api/records/${recordId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`,
    },
    body: JSON.stringify({ gender: 'male' }),
  })
  assert(res.ok, `状态码 ${res.status}`)

  const data = await res.json()
  assert(data.stepData.gender === 'male', '性别未保存')
})

await test('2.2 保存第二步（目标）', async () => {
  const res = await fetch(`${BASE_URL}/api/records/${recordId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`,
    },
    body: JSON.stringify({ goal: 'lose_weight' }),
  })
  assert(res.ok, `状态码 ${res.status}`)

  const data = await res.json()
  assert(data.stepData.gender === 'male', '之前的数据丢失')
  assert(data.stepData.goal === 'lose_weight', '目标未保存')
})

await test('2.3 保存完整数据', async () => {
  const res = await fetch(`${BASE_URL}/api/records/${recordId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`,
    },
    body: JSON.stringify({
      age: 25,
      height: 170,
      weight: 70,
      targetWeight: 65,
      activityLevel: 'moderate',
    }),
  })
  assert(res.ok, `状态码 ${res.status}`)
})

await test('2.4 未授权访问应失败', async () => {
  const res = await fetch(`${BASE_URL}/api/records/${recordId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ age: 30 }),
  })
  assert(res.status === 401, `应返回 401，实际 ${res.status}`)
})

await test('2.5 访问不存在的记录应失败', async () => {
  const res = await fetch(`${BASE_URL}/api/records/00000000-0000-0000-0000-000000000000`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`,
    },
    body: JSON.stringify({ age: 30 }),
  })
  assert(res.status === 404, `应返回 404，实际 ${res.status}`)
})

// ============================================
// 第三部分：提交与计算测试
// ============================================
console.log('\n📦 测试组 3: 提交与计算\n')

await test('3.1 提交不完整数据应失败', async () => {
  // 创建新记录，只填部分数据
  const sessionRes = await fetch(`${BASE_URL}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  const sessionData = await sessionRes.json()
  const incompleteRecordId = sessionData.recordId
  const incompleteToken = sessionData.sessionToken

  await fetch(`${BASE_URL}/api/records/${incompleteRecordId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${incompleteToken}`,
    },
    body: JSON.stringify({ gender: 'male', age: 25 }),
  })

  const res = await fetch(`${BASE_URL}/api/records/${incompleteRecordId}/submit`, {
    method: 'POST',
  })
  assert(res.status === 422, `应返回 422，实际 ${res.status}`)
})

await test('3.2 提交完整数据应成功', async () => {
  const res = await fetch(`${BASE_URL}/api/records/${recordId}/submit`, {
    method: 'POST',
  })
  assert(res.ok, `状态码 ${res.status}`)

  const data = await res.json()
  assert(data.bmi, '缺少 BMI')
  assert(data.targetCalories, '缺少 targetCalories')
  assert(data.targetDate, '缺少 targetDate')

  // 验证 BMI 计算正确性（70kg, 170cm）
  const expectedBMI = 70 / (1.7 * 1.7)
  assert(Math.abs(data.bmi - expectedBMI) < 0.1, `BMI 计算错误: ${data.bmi}`)
})

await test('3.3 重复提交应返回已有结果', async () => {
  const res = await fetch(`${BASE_URL}/api/records/${recordId}/submit`, {
    method: 'POST',
  })
  assert(res.ok, `状态码 ${res.status}`)

  const data = await res.json()
  assert(data.bmi, '应返回已有 BMI')
})

await test('3.4 提交后禁止修改 stepData', async () => {
  const res = await fetch(`${BASE_URL}/api/records/${recordId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`,
    },
    body: JSON.stringify({ weight: 80 }),
  })
  assert(res.status === 403, `应返回 403，实际 ${res.status}`)
})

// ============================================
// 第四部分：边界值测试
// ============================================
console.log('\n📦 测试组 4: 边界值测试\n')

await test('4.1 体重边界值 - 最小值 20kg', async () => {
  const sessionRes = await fetch(`${BASE_URL}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  const { recordId: rid, sessionToken: token } = await sessionRes.json()

  const res = await fetch(`${BASE_URL}/api/records/${rid}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      gender: 'female',
      goal: 'tone_up',
      age: 18,
      height: 150,
      weight: 20,
      activityLevel: 'light',
    }),
  })
  assert(res.ok, `边界值 20kg 应通过`)

  const submitRes = await fetch(`${BASE_URL}/api/records/${rid}/submit`, { method: 'POST' })
  const data = await submitRes.json()
  assert(data.bmi, 'BMI 应计算成功')
})

await test('4.2 体重边界值 - 最大值 300kg', async () => {
  const sessionRes = await fetch(`${BASE_URL}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  const { recordId: rid, sessionToken: token } = await sessionRes.json()

  const res = await fetch(`${BASE_URL}/api/records/${rid}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      gender: 'male',
      goal: 'lose_weight',
      age: 40,
      height: 200,
      weight: 300,
      targetWeight: 250,
      activityLevel: 'sedentary',
    }),
  })
  assert(res.ok, `边界值 300kg 应通过`)
})

await test('4.3 身高边界值 - 最小值 50cm', async () => {
  const sessionRes = await fetch(`${BASE_URL}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  const { recordId: rid, sessionToken: token } = await sessionRes.json()

  const res = await fetch(`${BASE_URL}/api/records/${rid}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      gender: 'female',
      goal: 'tone_up',
      age: 10,
      height: 50,
      weight: 20,
      activityLevel: 'light',
    }),
  })
  assert(res.ok, `边界值 50cm 应通过`)
})

await test('4.4 年龄边界值 - 最小值 10岁', async () => {
  const sessionRes = await fetch(`${BASE_URL}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  const { recordId: rid, sessionToken: token } = await sessionRes.json()

  const res = await fetch(`${BASE_URL}/api/records/${rid}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      gender: 'male',
      goal: 'build_muscle',
      age: 10,
      height: 140,
      weight: 35,
      activityLevel: 'active',
    }),
  })
  assert(res.ok, `边界值 10岁 应通过`)
})

await test('4.5 目标体重 ≥ 当前体重（已达目标）', async () => {
  const sessionRes = await fetch(`${BASE_URL}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  const { recordId: rid, sessionToken: token } = await sessionRes.json()

  await fetch(`${BASE_URL}/api/records/${rid}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      gender: 'female',
      goal: 'lose_weight',
      age: 30,
      height: 165,
      weight: 60,
      targetWeight: 65, // 目标体重大于当前
      activityLevel: 'moderate',
    }),
  })

  const submitRes = await fetch(`${BASE_URL}/api/records/${rid}/submit`, { method: 'POST' })
  const data = await submitRes.json()
  assert(data.targetDate === null, 'targetDate 应为 null')
})

// ============================================
// 第五部分：邮箱绑定测试
// ============================================
console.log('\n📦 测试组 5: 邮箱绑定\n')

await test('5.1 绑定邮箱', async () => {
  userEmail = `test-${Date.now()}@example.com`
  const res = await fetch(`${BASE_URL}/api/auth/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userEmail, recordId }),
  })
  assert(res.ok, `状态码 ${res.status}`)

  const data = await res.json()
  assert(data.sessionToken, '缺少 sessionToken')
  sessionToken = data.sessionToken // 更新 token
})

await test('5.2 重复绑定同一邮箱', async () => {
  const res = await fetch(`${BASE_URL}/api/auth/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userEmail }),
  })
  assert(res.ok, `状态码 ${res.status}`)
})

// ============================================
// 第六部分：订阅与权限测试
// ============================================
console.log('\n📦 测试组 6: 订阅与权限\n')

await test('6.1 未付费查看结果（脱敏）', async () => {
  const res = await fetch(`${BASE_URL}/api/records/${recordId}`, {
    headers: { 'Authorization': `Bearer ${sessionToken}` },
  })
  assert(res.ok, `状态码 ${res.status}`)

  const data = await res.json()
  assert(data.bmi, '应返回 BMI')
  assert(data.targetCalories, '应返回 targetCalories')
  assert(data.preview === true, '应标记为预览模式')
  assert(!data.healthPlan, '未付费不应返回 healthPlan')
})

await test('6.2 模拟支付', async () => {
  const res = await fetch(`${BASE_URL}/api/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionToken }),
  })
  assert(res.ok, `状态码 ${res.status}`)
})

await test('6.3 付费后查看完整结果', async () => {
  const res = await fetch(`${BASE_URL}/api/records/${recordId}`, {
    headers: { 'Authorization': `Bearer ${sessionToken}` },
  })
  assert(res.ok, `状态码 ${res.status}`)

  const data = await res.json()
  assert(data.bmi, '应返回 BMI')
  assert(data.healthPlan, '付费后应返回 healthPlan')
  assert(data.healthPlan.exercise, '缺少运动建议')
  assert(data.healthPlan.diet, '缺少饮食建议')
  assert(data.healthPlan.sleep, '缺少睡眠建议')
  assert(!data.preview, '不应标记为预览模式')
})

// ============================================
// 第七部分：历史记录测试
// ============================================
console.log('\n📦 测试组 7: 历史记录\n')

await test('7.1 获取历史记录列表', async () => {
  const res = await fetch(`${BASE_URL}/api/records`, {
    headers: { 'Authorization': `Bearer ${sessionToken}` },
  })
  assert(res.ok, `状态码 ${res.status}`)

  const data = await res.json()
  assert(Array.isArray(data), '应返回数组')
  assert(data.length > 0, '应至少有一条记录')
  assert(data[0].id, '记录应包含 id')
  assert(data[0].bmi, '记录应包含 bmi')
})

await test('7.2 创建第二条记录', async () => {
  const sessionRes = await fetch(`${BASE_URL}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionToken }),
  })
  const { recordId: newRecordId } = await sessionRes.json()

  await fetch(`${BASE_URL}/api/records/${newRecordId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`,
    },
    body: JSON.stringify({
      gender: 'male',
      goal: 'build_muscle',
      age: 25,
      height: 175,
      weight: 75,
      targetWeight: 80,
      activityLevel: 'very_active',
    }),
  })

  const submitRes = await fetch(`${BASE_URL}/api/records/${newRecordId}/submit`, { method: 'POST' })
  assert(submitRes.ok, '第二条记录提交失败')

  const listRes = await fetch(`${BASE_URL}/api/records`, {
    headers: { 'Authorization': `Bearer ${sessionToken}` },
  })
  const list = await listRes.json()
  assert(list.length >= 2, '应至少有两条记录')
})

// ============================================
// 第八部分：卡路里计算验证
// ============================================
console.log('\n📦 测试组 8: 卡路里计算验证\n')

await test('8.1 减重目标应减少卡路里', async () => {
  const sessionRes = await fetch(`${BASE_URL}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  const { recordId: rid, sessionToken: token } = await sessionRes.json()

  await fetch(`${BASE_URL}/api/records/${rid}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      gender: 'male',
      goal: 'lose_weight',
      age: 30,
      height: 175,
      weight: 80,
      targetWeight: 70,
      activityLevel: 'moderate',
    }),
  })

  const submitRes = await fetch(`${BASE_URL}/api/records/${rid}/submit`, { method: 'POST' })
  const data = await submitRes.json()

  // BMR ≈ 1800, TDEE ≈ 2700, 减重应 -500
  assert(data.targetCalories < 2700, `减重卡路里应小于 TDEE: ${data.targetCalories}`)
})

await test('8.2 增肌目标应增加卡路里', async () => {
  const sessionRes = await fetch(`${BASE_URL}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  const { recordId: rid, sessionToken: token } = await sessionRes.json()

  await fetch(`${BASE_URL}/api/records/${rid}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      gender: 'male',
      goal: 'build_muscle',
      age: 25,
      height: 180,
      weight: 70,
      activityLevel: 'active',
    }),
  })

  const submitRes = await fetch(`${BASE_URL}/api/records/${rid}/submit`, { method: 'POST' })
  const data = await submitRes.json()

  // BMR ≈ 1700, TDEE ≈ 2900, 增肌应 +400
  assert(data.targetCalories > 2900, `增肌卡路里应大于 TDEE: ${data.targetCalories}`)
})

// ============================================
// 测试结果汇总
// ============================================
console.log('\n' + '='.repeat(60))
console.log('📊 测试结果汇总\n')

const passed = results.filter(r => r.passed).length
const failed = results.filter(r => !r.passed).length
const total = results.length

console.log(`总计: ${total} 个测试`)
console.log(`✅ 通过: ${passed}`)
console.log(`❌ 失败: ${failed}`)
console.log(`⏱️  总耗时: ${results.reduce((sum, r) => sum + r.duration, 0)}ms\n`)

if (failed > 0) {
  console.log('失败的测试:')
  results.filter(r => !r.passed).forEach(r => {
    console.log(`  ❌ ${r.name}`)
    console.log(`     ${r.error}`)
  })
}

console.log('='.repeat(60))

process.exit(failed > 0 ? 1 : 0)
