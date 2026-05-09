# 健康测评系统

基于 Next.js 14 + Prisma + PostgreSQL 的健康测评后端系统，支持分步数据采集、服务端计算、订阅鉴权与差异化返回。

## 技术栈

- **框架**：Next.js 14（App Router）
- **语言**：TypeScript
- **ORM**：Prisma 5
- **数据库**：PostgreSQL（Supabase）
- **验证**：Zod 4
- **部署**：Vercel

---

## 快速启动

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env` 文件：

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
CRON_SECRET="your-cron-secret"
```

### 3. 初始化数据库

```bash
npx prisma db push
npx prisma generate
```

### 4. 填充测试数据（可选）

```bash
npm run seed
```

### 5. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

---

## 项目结构

```
health-app/
├── app/
│   ├── page.tsx                        # 首页
│   ├── questionnaire/page.tsx          # 7步问卷
│   ├── auth/page.tsx                   # 邮箱绑定页
│   ├── result/page.tsx                 # 结果页（含健康计划）
│   └── api/
│       ├── session/route.ts            # 创建/恢复会话
│       ├── records/route.ts            # 获取历史记录列表
│       ├── records/[id]/route.ts       # 分步保存 / 获取结果
│       ├── records/[id]/submit/route.ts# 提交并计算
│       ├── auth/send/route.ts          # 邮箱绑定
│       ├── pay/route.ts                # 模拟支付
│       └── cron/cleanup/route.ts       # 定时清理匿名数据
├── lib/
│   ├── prisma.ts        # Prisma 客户端单例
│   ├── calculations.ts  # BMI / 卡路里 / 达标日期计算
│   ├── healthPlan.ts    # 个性化健康计划生成
│   └── schemas.ts       # Zod 验证 schema
├── prisma/
│   ├── schema.prisma    # 数据库模型
│   └── seed.ts          # 测试数据
├── scripts/
│   └── test-api.ts      # API 测试脚本（25个用例）
├── types/index.ts        # TypeScript 类型定义
└── vercel.json           # Vercel Cron 配置
```

---

## API 文档

### POST /api/session
创建或恢复用户会话，自动关联未完成的健康记录。

**请求体**
```json
{ "sessionToken": "uuid（可选，首次不传）" }
```

**响应**
```json
{
  "sessionToken": "uuid",
  "userId": "uuid",
  "recordId": "uuid",
  "completed": false,
  "progress": {}
}
```

---

### PATCH /api/records/:id
分步保存测评数据（增量合并到 stepData）。

**请求头**：`Authorization: Bearer {sessionToken}`

**请求体**（任意字段，增量更新）
```json
{ "gender": "male", "age": 25 }
```

**错误**：`401` 未授权 / `403` 记录已完成不可修改 / `404` 不存在

---

### POST /api/records/:id/submit
提交测评，触发服务端计算（BMI、建议卡路里、目标日期、健康计划）。

**响应**
```json
{
  "bmi": 24.2,
  "targetCalories": 1950,
  "targetDate": "2026-10-15T00:00:00.000Z"
}
```

**错误**：`422` 数据不完整

---

### GET /api/records/:id
获取单条记录结果，根据订阅状态差异化返回。

**请求头**：`Authorization: Bearer {sessionToken}`

**未付费响应**
```json
{ "bmi": 24.2, "targetCalories": 1950, "targetDate": "...", "preview": true }
```

**付费响应**
```json
{
  "bmi": 24.2,
  "targetCalories": 1950,
  "targetDate": "...",
  "currentWeight": 70,
  "targetWeight": 60,
  "healthPlan": {
    "exercise": "每周4次有氧 + 3次力量训练...",
    "diet": "每日摄入1950kcal，高蛋白低碳水...",
    "sleep": "保证7-8小时睡眠..."
  }
}
```

---

### GET /api/records
获取当前用户所有已完成的历史记录。

**请求头**：`Authorization: Bearer {sessionToken}`

---

### POST /api/auth/send
绑定邮箱，upsert 用户，关联健康记录，返回 sessionToken。

**请求体**
```json
{ "email": "user@example.com", "recordId": "uuid（可选）" }
```

**响应**：`{ "sessionToken": "uuid" }`

---

### POST /api/pay
模拟支付，激活订阅。

**请求体**：`{ "sessionToken": "uuid" }`

**响应**：`{ "ok": true }`

---

### GET /api/cron/cleanup
清理 7 天前未完成且未绑定邮箱的匿名记录（Vercel Cron 每日凌晨 3 点触发）。

**请求头**：`Authorization: Bearer {CRON_SECRET}`

---

## 数据验证规则

| 字段 | 范围 |
|------|------|
| weight | 20 - 300 kg |
| height | 50 - 250 cm |
| age | 10 - 100 岁 |
| gender | male / female |
| goal | lose_weight / tone_up / build_muscle |
| activityLevel | sedentary / light / moderate / active / very_active |

---

## 服务端计算逻辑

```
BMI = weight(kg) / height(m)²

BMR（Mifflin-St Jeor）:
  男：10×weight + 6.25×height - 5×age + 5
  女：10×weight + 6.25×height - 5×age - 161

TDEE = BMR × 活动系数（1.2 ~ 1.9）

目标卡路里:
  减重：TDEE - 500
  增肌：TDEE + 400
  塑形：TDEE

目标日期 = 今天 + (体重差 × 7700 / 500) 天
```

---

## 运行 API 测试

```bash
npm install tsx --save-dev
npm run dev        # 终端 1
npm run test:api   # 终端 2
```

覆盖 25 个测试用例：正常流程、边界值、权限验证、幂等性、订阅差异化返回。

---

## 部署到 Vercel

1. 推送代码到 GitHub
2. 在 Vercel 导入项目
3. 配置环境变量：`DATABASE_URL`、`CRON_SECRET`
4. 部署完成后执行：`npx prisma db push`

Vercel Cron 已配置（`vercel.json`），每日凌晨 3 点自动清理匿名数据。
