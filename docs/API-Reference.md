# API 参考文档

Base URL: `http://10.2.0.7/api/v1`

## 通用说明

- 请求/响应格式: JSON
- Content-Type: `application/json`
- 时间格式: RFC3339 (`2026-08-07T00:00:00+08:00`)
- 追踪: 响应头含 `X-Trace-ID` 用于请求链追踪

---

## 活动管理

### 创建活动

```
POST /activities
```

**请求体:**
```json
{
  "name": "第34届青岛国际啤酒节",
  "description": "2026年8月啤酒节智能营销活动",
  "start_time": "2026-08-10T00:00:00+08:00",
  "end_time": "2026-08-31T23:59:59+08:00",
  "location": "青岛西海岸金沙滩啤酒城"
}
```

**响应:** `201 Created`
```json
{
  "id": "uuid",
  "name": "第34届青岛国际啤酒节",
  "status": "draft",
  "trace_id": "uuid"
}
```

### 活动列表

```
GET /activities
```

### 活动详情

```
GET /activities/:id
```

### 更新活动

```
PUT /activities/:id
```

### 审批活动

```
POST /activities/:id/approve
```

将活动从 `draft` 状态切换到 `active`。

### 暂停活动

```
POST /activities/:id/suspend
```

将活动从 `active` 状态切换到 `paused`。

---

## 促销规则

### 创建促销

```
POST /activities/:id/promotions
```

**折扣类型:**
```json
{
  "name": "啤酒满200减50",
  "type": "discount",
  "rule": {"min_amount": 200, "discount_amount": 50},
  "priority": 1
}
```

**优惠券类型:**
```json
{
  "name": "打卡赠精酿啤酒",
  "type": "coupon",
  "rule": {"coupon_type": "free_drink", "quantity": 1000},
  "priority": 2
}
```

**套餐类型:**
```json
{
  "name": "双人畅饮套餐",
  "type": "bundle",
  "rule": {"original_price": 298, "bundle_price": 198, "items": ["beer_x2", "snack_x1"]},
  "priority": 3
}
```

### 查看促销

```
GET /activities/:id/promotions    # 活动下促销列表
GET /promotions                   # 全部促销
```

---

## 优惠券

### 发放优惠券

```
POST /coupons
```

```json
{
  "activity_id": "uuid",
  "promotion_id": "uuid",
  "user_id": "user_test_001",
  "channel": "app"
}
```

**响应:** `201 Created`
```json
{
  "code": "CP-user_tes-1723000000",
  "status": "issued",
  "user_id": "user_test_001",
  "expires_at": "2026-08-14T00:00:00+08:00"
}
```

### 核销优惠券 (原子操作)

```
POST /coupons/:code/use
```

```json
{
  "store_id": "store_001",
  "amount": 198
}
```

**幂等性**: 同一券码多次核销返回不同错误：
- 已使用: `coupon CP-xxx status is used`
- 已过期: `coupon CP-xxx expired at 2026-08-14`

### 用户券列表

```
GET /coupons?user_id=xxx
```

---

## 客户分群 (V2)

### 创建分群

```
POST /segments
```

```json
{
  "name": "啤酒节高消费游客",
  "rules": {
    "min_age": 18,
    "max_age": 55,
    "min_spend": 100,
    "regions": ["山东", "北京", "上海"],
    "member_days": 1
  }
}
```

### 重算分群资格

```
POST /segments/:id/requalify
```

遍历全量用户，逐用户调用 Evaluate 判定资格，支持规则版本号热更新。

---

## A/B 实验 (M4)

### 创建实验

```
POST /experiments
```

```json
{
  "name": "首页促销弹窗 A/B 测试",
  "activity_id": "uuid",
  "variants": [
    {"name": "control", "traffic_ratio": 0.5},
    {"name": "treatment", "traffic_ratio": 0.5}
  ]
}
```

### 启动实验

```
POST /experiments/:id/start
```

### 完成实验

```
POST /experiments/:id/complete
```

---

## 模拟器 (M4)

### 运行业务日

```
POST /simulator/run
```

```json
{
  "activity_id": "uuid",
  "day": 1,
  "users_per_day": 200
}
```

模拟单日运营：生成 100-300 用户、创建订单、发放优惠券、检测异常。

### 运行全场景

```
POST /simulator/run-full
```

```json
{
  "activity_id": "uuid"
}
```

模拟 14 天完整运营周期。

---

## 运营看板

### 活动看板

```
GET /dashboard/:activity_id
```

```json
{
  "activity_name": "第34届青岛国际啤酒节",
  "total_users": 2800,
  "total_orders": 15230,
  "total_coupons_issued": 4200,
  "total_coupons_used": 3150,
  "usage_rate": 0.75,
  "total_revenue": 856000
}
```

---

## 健康检查

```
GET /ping
```

**响应:** `{"status":"ok"}`
