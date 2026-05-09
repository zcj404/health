# 健康测评系统

基于 Next.js 14 + Prisma + PostgreSQL 的健康测评后端系统，支持分步数据采集、服务端计算、订阅鉴权与差异化返回。

**线上演示**：https://health-b6lj.vercel.app（打不开的话开梯子就可以了）

**API 文档**：[API.md](./API.md)

---

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
DATABASE_URL="postgresql://postgres.zsjymxewmqgmzgumhqsr:0yOAbD0bo8Kdk8ov@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"
CRON_SECRET="my-secret-123"
```

### 3. 初始化数据库

```bash
npx prisma db push
npx prisma generate
```

### 4. 启动开发服务器

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
│   └── schema.prisma    # 数据库模型
├── types/index.ts        # TypeScript 类型定义
├── API.md                # 完整 API 文档
└── vercel.json           # Vercel Cron 配置
```

---

## 部署到 Vercel

1. 推送代码到 GitHub
2. 在 Vercel 导入项目
3. 配置环境变量：`DATABASE_URL`、`CRON_SECRET`
4. 部署完成后执行：`npx prisma db push`

Vercel Cron 已配置（`vercel.json`），每日凌晨 3 点自动清理匿名数据。
