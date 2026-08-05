# 开发 & 测试任务看板 — 青岛啤酒节智能营促销系统

> 更新时间：2026-08-05 09:41 | 负责人：beerfest-leader

---

## 开发任务总览（T1 - T7）

| ID | 任务 | 负责人 | 状态 | 阻断项 |
|----|------|--------|------|--------|
| T1 | Prisma Schema + DataAdapter 层 | @beerfest-rd | ✅ 完成 | `0f05919` |
| T2 | 种子数据 & 事件生成器 | @beerfest/simulator | ✅ 完成 | — |
| T3 | API Routes（17 端点） | @beerfest-rd | ✅ 完成 | `0f05919` |
| T4 | 游客端页面（首页/校验/券包） | @beerfest-rd | ✅ 完成 | `/` + `/verify` + `/coupons` |
| T5 | 运营端页面（驾驶舱/活动/审批/评估） | @beerfest-rd | ✅ 完成 | `/dashboard` 4 页 |
| T6 | V1 业务场景测试 | @beerfest-rd + @beerfest-qa | ✅ 完成 | 86 tests / 8 files, all passing |
| T7 | QA 测试执行 & 报告 | @beerfest-qa | 🔴 未开始 | 等待 QA 触发 |

---

## 测试概览

| 指标 | 数值 |
|------|------|
| 总用例数（计划） | 71 单元 + 15 E2E |
| 已实现 | 86（全部通过） |
| 通过 | 86 |
| 失败 | 0 |

---

## 1. 单元测试 — Vitest (71 tests / 6 files)

| 文件 | 用例数 | 状态 |
|------|--------|------|
| campaign-state.test.ts | 19 | ✅ 全部通过 |
| eligibility.test.ts | 12 | ✅ 全部通过 |
| coupon-claim.test.ts | 9 | ✅ 全部通过 |
| budget-inventory.test.ts | 11 | ✅ 全部通过 |
| api/visitor-api.test.ts | 10 | ✅ 全部通过 |
| api/admin-api.test.ts | 10 | ✅ 全部通过 |

---

## 2. E2E 测试 — Playwright (15 tests / 2 files)

### V1 主流程（tests/e2e/v1-main-flow.spec.ts）

| 用例 | 状态 |
|------|------|
| 游客查看可用活动列表 | ✅ |
| 游客领券（正常流程） | ✅ |
| 游客重复领券被拦截 | ✅ |
| 游客下单使用券 | ✅ |
| 运营查看驾驶舱 KPI | ✅ |
| 运营创建活动草案 | ✅ |
| 运营提交审批 | ✅ |
| 审批通过 → 活动运行 | ✅ |
| 活动暂停（库存触发） | ✅ |
| 运营恢复活动 | ✅ |
| 运营查看实验结果 | ✅ |

### V2 家庭客群回归（tests/e2e/v2-regression.spec.ts）

| 用例 | 状态 |
|------|------|
| 家庭游客仅见餐饮文创券 | ✅ |
| 成年验证后才见含酒精券 | ✅ |
| 审批页展示客群资格说明 | ✅ |
| V1 全部流程回归 | ✅ |

---

## 3. 执行命令

```bash
# 全部单元测试
pnpm test:unit

# 全部 E2E 测试（需先启动 dev server）
pnpm --filter web dev &
npx playwright test --config=tests/playwright.config.ts

# 全部测试
pnpm test && npx playwright test --config=tests/playwright.config.ts
```
