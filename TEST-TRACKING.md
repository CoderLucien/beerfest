# 开发 & 测试任务看板 — 啤酒节智能营促销系统

> 更新时间：2026-08-04 22:50 | 负责人：beerfest-leader

---

## 开发任务总览（T1 - T7）

| ID | 任务 | 负责人 | 状态 | 阻断项 |
|----|------|--------|------|--------|
| T1 | Prisma Schema + DataAdapter 层 | @beerfest-rd | 🟡 进行中 | — |
| T2 | 种子数据 & 事件生成器 | @beerfest/simulator | ✅ 完成 | — |
| T3 | API Routes（15 端点） | @beerfest-rd | 🔴 未开始 | 阻塞于 T1 |
| T4 | 游客端页面（首页/校验/券包） | @beerfest-rd | 🟡 部分完成 | 登录页 ✅，其余阻塞于 T3 |
| T5 | 运营端页面（驾驶舱/活动/审批/评估） | @beerfest-rd | 🟡 部分完成 | Dashboard 骨架 ✅，其余阻塞于 T3 |
| T6 | V1 业务场景测试 | @beerfest-rd + @beerfest-qa | 🟡 部分完成 | 25/58 已实现 |
| T7 | QA 测试执行 & 报告 | @beerfest-qa | 🔴 未开始 | 阻塞于 T6 |

**当前 Sprint 目标**：Web 登录页面可访问，展示演示账号选择入口。

---

## 测试概览

| 指标 | 数值 |
|------|------|
| 总用例数（计划） | 58+ |
| 已实现 | 25 |
| 通过 | 待执行 |
| 失败 | 待执行 |
| 覆盖率目标 | 单元 >80%，E2E 覆盖全部 P0 流程 |

---

## 1. 单元测试 — Vitest

### 1.1 状态机测试（tests/unit/campaign-state.test.ts）

| 用例 | 状态 | 备注 |
|------|------|------|
| draft → pending_approval | ✅ 已实现 | |
| draft → cancelled | ✅ 已实现 | |
| draft → running（非法） | ✅ 已实现 | |
| running → paused | ✅ 已实现 | |
| paused → running | ✅ 已实现 | |
| completed 不可再转换 | ✅ 已实现 | |
| 非法路径返回 error | ✅ 已实现 | |
| 合法路径返回 success | ✅ 已实现 | |
| 同状态转换允许 | ✅ 已实现 | |
| 库存低于阈值暂停 | ✅ 已实现 | |
| 退款率超阈值暂停 | ✅ 已实现 | |
| 预算耗尽暂停 | ✅ 已实现 | |
| 全部正常不暂停 | ✅ 已实现 | |
| 零订单退款率不崩溃 | ✅ 已实现 | |

**小计：14 / 14 已实现**

### 1.2 资格校验测试（tests/unit/eligibility.test.ts）

| 用例 | 状态 | 备注 |
|------|------|------|
| 无规则时游客通过 | ✅ 已实现 | |
| age_gate 拦截未成年人 | ✅ 已实现 | |
| family_only 拦截成人游客 | ✅ 已实现 | |
| family_only 允许家庭游客 | ✅ 已实现 | |
| alcohol_verified 拦截未验证 | ✅ 已实现 | |
| 多规则累积拒绝原因 | ✅ 已实现 | |
| 家庭游客过滤酒精商品 | ✅ 已实现 | |
| 未验证成人过滤酒精商品 | ✅ 已实现 | |
| 已验证成人看全部商品 | ✅ 已实现 | |
| 同游客分组稳定 | ✅ 已实现 | |
| 分组为 control/experiment | ✅ 已实现 | |

**小计：11 / 11 已实现**

### 1.3 发券幂等测试（tests/unit/coupon-claim.test.ts）

| 用例 | 状态 | 依赖 |
|------|------|------|
| 首次领取成功 | ⬜ 待实现 | coupon 模块 |
| 重复领取返回已有券 | ⬜ 待实现 | coupon 模块 |
| 不同 campaign 各自独立 | ⬜ 待实现 | coupon 模块 |
| 幂等键跨请求一致 | ⬜ 待实现 | coupon 模块 |
| 预算不足时拒绝 | ⬜ 待实现 | budget 模块 |
| 库存不足时拒绝 | ⬜ 待实现 | inventory 模块 |
| 活动未运行时拒绝 | ⬜ 待实现 | campaign state |
| 资格不满足时拒绝 | ⬜ 待实现 | eligibility |

**小计：0 / 8**

### 1.4 预算与库存测试（tests/unit/budget-inventory.test.ts）

| 用例 | 状态 | 依赖 |
|------|------|------|
| 发券扣减预算 | ⬜ 待实现 | budget 模块 |
| 预算耗尽拒绝新请求 | ⬜ 待实现 | budget 模块 |
| 并发领取预算一致性 | ⬜ 待实现 | budget 模块 |
| 发券占用库存 | ⬜ 待实现 | inventory 模块 |
| 库存低于阈值触发暂停 | ⬜ 待实现 | inventory 模块 |
| 退款释放库存 | ⬜ 待实现 | inventory 模块 |
| 部分退款正确计算 | ⬜ 待实现 | inventory 模块 |

**小计：0 / 7**

---

## 2. API 集成测试（Vitest + fetch）

### 2.1 访客 API

| 用例 | 状态 | 备注 |
|------|------|------|
| GET /api/campaigns — 返回进行中活动 | ⬜ 待实现 | T3 完成后 |
| GET /api/campaigns — 家庭游客过滤 | ⬜ 待实现 | V2 需求 |
| POST /api/coupons — 正常领取 | ⬜ 待实现 | |
| POST /api/coupons — 幂等性 | ⬜ 待实现 | |
| POST /api/coupons — 预算不足 | ⬜ 待实现 | |
| POST /api/orders — 正常下单 | ⬜ 待实现 | |
| POST /api/orders — 核销 | ⬜ 待实现 | |
| GET /api/visitors — 返回访客信息 | ⬜ 待实现 | |
| GET /api/zones — 返回区域状态 | ⬜ 待实现 | |

**小计：0 / 9**

### 2.2 管理 API

| 用例 | 状态 | 备注 |
|------|------|------|
| GET /api/dashboard — 返回 KPI 数据 | ⬜ 待实现 | T3 完成后 |
| POST /api/campaigns — 创建活动 | ⬜ 待实现 | |
| GET /api/campaigns/[id] — 活动详情 | ⬜ 待实现 | |
| POST /api/campaigns/[id]/submit — 提交审批 | ⬜ 待实现 | |
| POST /api/campaigns/[id]/approve — 审批通过 | ⬜ 待实现 | |
| POST /api/campaigns/[id]/reject — 审批拒绝 | ⬜ 待实现 | |
| POST /api/campaigns/[id]/pause — 暂停 | ⬜ 待实现 | |
| POST /api/campaigns/[id]/resume — 恢复 | ⬜ 待实现 | |
| GET /api/campaigns/[id]/results — 实验结果 | ⬜ 待实现 | |
| GET /api/events — 事件流 | ⬜ 待实现 | |

**小计：0 / 10**

---

## 3. E2E 测试 — Playwright

### 3.1 V1 主流程（tests/e2e/v1-main-flow.spec.ts）

| 用例 | 状态 | 覆盖能力 |
|------|------|----------|
| 游客查看可用活动列表 | ⬜ 待实现 | P0-4 |
| 游客领券（正常流程） | ⬜ 待实现 | P0-4 |
| 游客重复领券被拦截 | ⬜ 待实现 | P0-4（幂等） |
| 游客下单使用券 | ⬜ 待实现 | P0-4 |
| 运营查看驾驶舱 KPI | ⬜ 待实现 | P0-1 |
| 运营创建活动草案 | ⬜ 待实现 | P0-2 |
| 运营提交审批 | ⬜ 待实现 | P0-3 |
| 审批通过 → 活动运行 | ⬜ 待实现 | P0-3 |
| 活动自动暂停（库存触发） | ⬜ 待实现 | P0-5 |
| 运营查看暂停原因并恢复 | ⬜ 待实现 | P0-1 + P0-5 |
| 运营查看实验结果 | ⬜ 待实现 | P0-6 |

**小计：0 / 11**

### 3.2 V2 家庭客群回归（tests/e2e/v2-regression.spec.ts）

| 用例 | 状态 | 覆盖能力 |
|------|------|----------|
| 家庭游客仅见餐饮文创券 | ⬜ 待实现 | P0-7（V2） |
| 成年验证后才见含酒精券 | ⬜ 待实现 | P0-7（V2） |
| 审批页展示客群资格说明 | ⬜ 待实现 | P0-7（V2） |
| V1 全部流程回归 | ⬜ 待实现 | P0-7（回归） |

**小计：0 / 4**

---

## 4. 测试执行记录

| 日期 | 执行人 | 类型 | 用例数 | 通过 | 失败 | 备注 |
|------|--------|------|--------|------|------|------|
| — | — | — | — | — | — | 尚未执行 |

---

## 5. 执行命令

```bash
# 全部测试
pnpm test

# 仅单元测试
pnpm test:unit

# 仅 E2E 测试（需先启动 dev server）
pnpm dev & pnpm test:e2e

# 带覆盖率
pnpm --filter tests vitest run --coverage
```

---

## 6. 已知阻塞项

| 阻塞项 | 影响 | 状态 |
|--------|------|------|
| ~~GitHub 推送认证失败~~ | — | ✅ 已解决（SSH 走 443，已推送 `ed1dbff` + `7f4864a`） |
| apps/web/src/ 为空 | ~~T3-T7 全部阻塞~~ | ✅ 已解决（骨架 + 登录页 + Dashboard 已搭建） |
| ~~node_modules 未安装~~ | — | ✅ 已解决（pnpm install 完成） |
| Prisma Schema 未创建 | T3 API Routes 阻塞 | 🟡 待推进 @beerfest-rd |
