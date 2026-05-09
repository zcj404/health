# API 文档

**线上地址**：https://health-b6lj.vercel.app

---

## 接口列表

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/session | 创建/恢复会话 |
| PATCH | /api/records/:id | 分步保存数据 |
| POST | /api/records/:id/submit | 提交并计算 |
| GET | /api/records/:id | 获取结果 |
| GET | /api/records | 获取历史记录 |
| POST | /api/auth/send | 邮箱绑定 |
| POST | /api/pay | 模拟支付 |
| GET | /api/cron/cleanup | 定时清理 |

---

## POST /api/session

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

## PATCH /api/records/:id

分步保存测评数据（增量合并到 stepData）。

**请求头**：`Authorization: Bearer {sessionToken}`

**请求体**（任意字段，增量更新）
```json
{ "gender": "male", "age": 25 }
```

**错误码**
- `401` 未授权
- `403` 记录已完成，不可修改
- `404` 记录不存在

---

## POST /api/records/:id/submit

提交测评，触发服务端计算（BMI、建议卡路里、目标日期、健康计划）。

**响应**
```json
{
  "bmi": 24.2,
  "targetCalories": 1950,
  "targetDate": "2026-10-15T00:00:00.000Z"
}
```

**错误码**
- `422` 数据不完整（缺少必填字段）

---

## GET /api/records/:id

获取单条记录结果，根据订阅状态差异化返回。

**请求头**：`Authorization: Bearer {sessionToken}`

**未付费响应**
```json
{
  "bmi": 24.2,
  "targetCalories": 1950,
  "targetDate": "2026-10-15T00:00:00.000Z",
  "preview": true
}
```

**付费响应**
```json
{
  "bmi": 24.2,
  "targetCalories": 1950,
  "targetDate": "2026-10-15T00:00:00.000Z",
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

## GET /api/records

获取当前用户所有已完成的历史记录。

**请求头**：`Authorization: Bearer {sessionToken}`

**响应**
```json
[
  {
    "id": "uuid",
    "bmi": 24.2,
    "targetCalories": 1950,
    "targetDate": "2026-10-15T00:00:00.000Z",
    "createdAt": "2026-05-01T00:00:00.000Z"
  }
]
```

---

## POST /api/auth/send

绑定邮箱，upsert 用户，关联健康记录，返回 sessionToken。

**请求体**
```json
{ "email": "user@example.com", "recordId": "uuid（可选）" }
```

**响应**
```json
{ "sessionToken": "uuid" }
```

---

## POST /api/pay

模拟支付，激活订阅。

**请求体**
```json
{ "sessionToken": "uuid" }
```

**响应**
```json
{ "ok": true }
```

---

## GET /api/cron/cleanup

清理 7 天前未完成且未绑定邮箱的匿名记录（Vercel Cron 每日凌晨 3 点自动触发）。

**请求头**：`Authorization: Bearer {CRON_SECRET}`

**响应**
```json
{ "deleted": 5 }
```

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
