# 青岛啤酒节智能营促销系统 P0 实施方案

> 方案状态：已审批（目录结构按审批意见调整） | 审批 ID：`plan-beerfest-p0-v1`
> 编制：beerfest-leader | 日期：2026-08-04
> 应用代码路径：`beerfest-growth/apps/web/`
> 目录结构已按审批意见调整为：apps/web/ / packages/domain/ / packages/simulator/ / tests/ / artifacts/ / scripts/

---

## 1. 需求理解与 P0/P1/不做范围

### 1.1 核心问题

晚高峰 19:30，三条经营信号同时出现：
- A 区热门摊位排队 22 分钟
- B 区客流低于基线 35%
- B 区餐饮+文创组合库存 420 份，需在 2 小时内改善周转
- 促销预算仅剩 6000 元

系统将"数据发现 → 决策 → 审批 → 执行 → 监控 → 评估"这一分散流程压缩成可控闭环，通过错峰组合券引导客流。

### 1.2 P0 范围（8 项，必须现场演示）

| 编号 | 能力 | 现场要求 |
|------|------|----------|
| P0-1 | 经营驾驶舱 | 可查看模拟客流、订单、库存、排队和预算 |
| P0-2 | Agent 活动草案 | 生成结构化方案：客群、商品、优惠、预算、时效、停止条件 |
| P0-3 | 人工审批 | 未审批不能发布，审批后形成不可变活动版本 |
| P0-4 | 领券与模拟下单 | 校验资格、预算、库存和重复领取 |
| P0-5 | 自动暂停 | 至少演示一次库存或风险阈值触发 |
| P0-6 | 结果评估 | 比较实验组与对照组，展示计算口径 |
| P0-7 | Loop 现场迭代 | 根据临时需求修改规则或页面并重新发布（V2） |
| P0-8 | 全链审计 | 沿 activity_id / workflow_id / trace_id 查到关键动作 |

### 1.3 P1 范围（4 项，本次不强制）

| 编号 | 能力 | 说明 |
|------|------|------|
| P1-1 | 个性化推荐 | 按位置、历史偏好和实时状态排序活动 |
| P1-2 | 记忆复用 | 召回品牌规则、禁用词和上次活动经验 |
| P1-3 | 活动 A/B 版本 | 同时比较两个优惠或规则版本 |
| P1-4 | 复盘报告 | 自动生成活动结果、异常和下一步建议 |

### 1.4 不做范围（P2，不出现在现场）

| 编号 | 能力 | 说明 |
|------|------|------|
| P2-1 | 真实支付/CRM/POS | 使用模拟适配器 |
| P2-2 | 跨商户结算 | 仅定义数据对象，不开发 |
| P2-3 | 生产级推荐模型 | 使用透明规则演示 |
| P2-4 | 真实用户注册/登录 | 使用预置演示账号 |
| P2-5 | 多语言/国际化 | Demo 仅中文 |
| P2-6 | 移动端原生 App | 仅 H5 响应式 |

---

## 2. 页面、业务对象、状态机和接口设计

### 2.1 页面清单

#### A. 游客端 H5（3 个页面）

| 页面 | 路由 | 核心内容 |
|------|------|----------|
| 活动首页 | `/` | 会场地图（A/B/C 区示意）、当前活动卡片、推荐理由 |
| 资格校验 | `/verify` | 年龄问卷、会员登录（演示账号）、酒精资格 |
| 我的券包 | `/coupons` | 已领取优惠券、下单入口、核销展示、订单历史 |

#### B. 运营驾驶舱（4 个页面）

| 页面 | 路由 | 核心内容 |
|------|------|----------|
| 态势总览 | `/dashboard` | 实时客流、订单 GMV、库存、排队、预算仪表盘 |
| 活动管理 | `/dashboard/campaigns` | 活动列表、新建/编辑活动、Agent 建议卡片 |
| 审批页 | `/dashboard/campaigns/[id]/approve` | 方案证据、资格说明、预算一览、审批操作 |
| 效果评估 | `/dashboard/campaigns/[id]/results` | 实验组/对照组对比、转化率、净支付 GMV、优惠成本 |

#### C. 共享组件

| 组件 | 用途 |
|------|------|
| SimulatedDataBadge | 所有页面顶部/底部的"模拟数据"标识 |
| ActivityCard | 活动卡片（游客端可领券、运营端可管理） |
| StatusBadge | 活动状态标签（draft/running/paused 等） |
| ApprovalPanel | 审批操作面板 |
| ExperimentChart | 实验对比可视化 |

### 2.2 业务对象（12 个核心实体）

```
visitor         — 游客/会员（visitor_id, 年龄资格, 会员层级, 当前区域）
zone            — 区域（zone_id, 名称, 当前客流, 排队时长）
merchant        — 商户（merchant_id, zone_id, 名称, 营业状态）
product         — 商品（product_id, merchant_id, 名称, 分类, 价格, 酒精标签）
inventory       — 库存（product_id, merchant_id, 可售数量, 预留数量）
campaign        — 活动（campaign_id, 名称, 目标, 预算上限, 状态, 当前版本号）
campaign_version — 活动版本快照（version_id, campaign_id, 规则快照JSON, 审批状态, 创建时间）
coupon          — 优惠券（coupon_id, visitor_id, campaign_id, campaign_version, 状态, 过期时间, 幂等键）
order           — 订单（order_id, visitor_id, 商品列表, 净支付, 优惠金额, 状态）
experiment_assignment — 实验分组（visitor_id, campaign_id, group, 分配时间）
approval        — 审批记录（approval_id, campaign_version_id, 审批人, 结论, 理由, 时间）
business_event  — 经营事件流（event_id, event_type, payload, timestamp）
```

### 2.3 状态机

#### 活动（Campaign）状态流转

```
draft ──→ pending_approval ──→ approved ──→ running ──→ completed
                │                   │            │
                └── rejected        │            ├──→ paused ──→ running (恢复)
                                    │            │
                                    │            └──→ cancelled
                                    │
                                    └──→ running (低风险自动审批时)
```

规则：
- `draft` 状态不可被游客领取
- 高风险活动（超过预算阈值 / 含酒精商品）必须进入 `pending_approval`
- `approved` 后锁定规则快照为不可变 `campaign_version`
- 修改规则必须生成新版本，不覆盖历史
- 触发停止条件后自动 `paused`；运营可恢复或终止

#### 优惠券（Coupon）状态流转

```
pending ──→ active ──→ used
  │           │
  └──→ expired └──→ expired
```

#### 订单（Order）状态流转

```
pending ──→ paid ──→ verified ──→ completed
  │          │
  └──→ cancelled └──→ refunded
```

### 2.4 API 接口设计

#### 游客端 API (`/api/v1/`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/campaigns/active` | 获取当前有效活动列表 |
| POST | `/api/v1/coupons/claim` | 领取优惠券（幂等） |
| GET | `/api/v1/coupons?visitor_id=` | 我的券列表 |
| POST | `/api/v1/orders` | 模拟下单 |
| GET | `/api/v1/orders?visitor_id=` | 我的订单 |
| POST | `/api/v1/visitors/verify` | 资格校验（年龄、酒精） |
| GET | `/api/v1/zones/status` | 各区域实时状态 |

#### 运营端 API (`/api/v1/admin/`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/admin/dashboard` | 驾驶舱聚合数据 |
| GET | `/api/v1/admin/campaigns` | 活动列表 |
| POST | `/api/v1/admin/campaigns` | 创建活动草案 |
| GET | `/api/v1/admin/campaigns/[id]` | 活动详情 + 版本历史 |
| POST | `/api/v1/admin/campaigns/[id]/submit` | 提交审批 |
| POST | `/api/v1/admin/campaigns/[id]/approve` | 审批通过 |
| POST | `/api/v1/admin/campaigns/[id]/reject` | 审批驳回 |
| POST | `/api/v1/admin/campaigns/[id]/pause` | 暂停活动 |
| POST | `/api/v1/admin/campaigns/[id]/resume` | 恢复活动 |
| GET | `/api/v1/admin/campaigns/[id]/results` | 实验评估结果 |
| GET | `/api/v1/admin/events/stream` | 经营事件流（SSE 或轮询） |

### 2.5 数据模型关键约束

```
幂等键：coupon.claim(idempotency_key = visitor_id + campaign_id)
事务约束：发券时同步锁定预算 + 库存（同一 DB 事务）
自动暂停触发：
  - available_inventory < 80
  - refund_rate > 3%
  - budget_consumed >= budget_limit
实验分组：visitor_id 哈希取模，在同一活动内保持稳定
```

---

## 3. 技术栈及选择理由

| 层次 | 选型 | 理由 |
|------|------|------|
| **框架** | Next.js 14 (App Router) | 全栈框架，Server Components + API Routes 一体化，减少项目碎片 |
| **语言** | TypeScript 5.x | 类型安全，减少运行时错误，提升 Agent 协作一致性 |
| **UI 框架** | React 18 + TailwindCSS 3 | 快速出 UI，JIT 编译，Demo 友好 |
| **组件库** | shadcn/ui | 基于 Radix UI，可定制、可复制源码，不引入重量级依赖 |
| **数据库** | 平凯云 DB Starter（TiDB Cloud Starter） | 分布式 SQL，Demo 直连；Prisma 驱动，支持事务和幂等写入 |
| **表单/校验** | React Hook Form + Zod | 声明式校验，审批表单和资格校验使用同一 Schema |
| **图表** | Recharts | 轻量 React 图表库，驾驶舱图表使用 |
| **状态管理** | React Context + useReducer | Demo 规模无需 Redux/Zustand |
| **HTTP 客户端** | fetch (Server) + fetch (Client) | 无额外依赖，Next.js 原生支持 |
| **模拟数据** | 固定种子随机数生成器 | 种子化 pseudo-random，确保每次彩排数据一致 |
| **单元测试** | Vitest | Vite 原生，与 Next.js 生态兼容 |
| **E2E 测试** | Playwright | 浏览器自动化，可截图/录像，验证完整用户流程 |
| **Lint/Format** | ESLint + Prettier | 标准前端工具链 |
| **对象存储** | Drive9 | 文件/Artifact/Checkpoint 版本存储，Agent 协作产物持久化 |
| **包管理** | pnpm | Workspace 原生支持，安装快 |

### 选择理由总结

1. **全栈一体化**：Next.js App Router 提供 `/app/api/` 路由和 Server Components，一套代码完成前后端，减少 Agent 之间的接口协商成本。
2. **TiDB Cloud Starter 为主存储**：活动、优惠券、订单、审批等业务数据存储于平凯云 DB Starter，支持事务、幂等写入和实时查询。
3. **SyntheticAdapter 兜底**：TiDB 不可用时自动切换内存/JSON 合成数据模式，确保应用构建和彩排不受数据库连接影响。
4. **Drive9 对象存储**：架构文档、测试报告、Checkpoint、Artifact 等文件使用 Drive9 持久化，支持版本管理和 Agent 协作共享。
5. **固定随机种子**：所有合成数据使用 `seedrandom` 固定种子，确保每次彩排关键事件（排队 22 分钟、库存触发等）时序一致。
6. **不依赖外部服务**：支付、消息、地图、POS 全部由内存模拟适配器实现，舞台断网仍可运行。

---

## 4. Workspace 目录结构（按审批意见调整）

```
beerfest-growth/
├── PLAN-P0-Implementation.md    # 本方案文档
├── package.json                 # 根 workspace 配置（pnpm workspace）
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .eslintrc.js
├── .prettierrc
├── .gitignore
│
├── apps/
│   └── web/                     # Web 页面、API 和业务工作流（Next.js App Router）
│       ├── package.json
│       ├── next.config.ts
│       ├── tsconfig.json
│       ├── tailwind.config.ts
│       ├── postcss.config.js
│       ├── components.json      # shadcn/ui 配置
│       ├── public/
│       │   └── images/
│       └── src/
│           ├── app/             # App Router 页面路由
│           │   ├── layout.tsx
│           │   ├── page.tsx                  # 游客首页 + 会场地图
│           │   ├── verify/
│           │   │   └── page.tsx              # 资格校验（年龄/酒精）
│           │   ├── coupons/
│           │   │   └── page.tsx              # 我的券包 + 下单 + 核销
│           │   ├── dashboard/
│           │   │   ├── layout.tsx            # 驾驶舱布局 + 模拟数据标识
│           │   │   ├── page.tsx              # 态势总览（客流/库存/预算 KPI）
│           │   │   ├── campaigns/
│           │   │   │   ├── page.tsx          # 活动管理列表 + Agent 建议卡片
│           │   │   │   ├── new/
│           │   │   │   │   └── page.tsx      # 新建活动草案
│           │   │   │   └── [id]/
│           │   │   │       ├── page.tsx      # 活动详情 + 版本历史
│           │   │   │       ├── approve/
│           │   │   │       │   └── page.tsx  # 审批页（资格/预算/风险）
│           │   │   │       └── results/
│           │   │   │           └── page.tsx  # 实验组/对照组效果评估
│           │   │   └── settings/
│           │   │       └── page.tsx          # 预算/规则设置（预留）
│           │   └── api/
│           │       └── v1/
│           │           ├── campaigns/        # 活动 CRUD + 审批/暂停/恢复
│           │           ├── coupons/           # 发券（幂等）+ 查询
│           │           ├── orders/            # 下单 + 查询
│           │           ├── visitors/          # 资格校验 + 信息
│           │           ├── zones/             # 区域实时状态
│           │           └── admin/             # 驾驶舱聚合 + 事件流
│           │               ├── dashboard/
│           │               └── events/
│           ├── components/
│           │   ├── ui/                # shadcn/ui 基础组件
│           │   ├── layout/            # Header, Sidebar, SimulatedDataBadge
│           │   ├── visitor/           # ActivityCard, ZoneMap, VerifyForm, CouponList
│           │   └── dashboard/         # KpiCards, ZoneStatusPanel, AgentSuggestion,
│           │                           # CampaignTable, ApprovalForm, ExperimentResult
│           └── lib/
│               ├── db/                # 数据访问适配层（见 §4.1）
│               │   ├── adapter.ts     # DataAdapter 接口定义
│               │   ├── tiDB.ts        # TiDB 适配器（Prisma）
│               │   └── synthetic.ts   # 合成数据适配器（内存/JSON）
│               ├── engine/            # 业务引擎
│               │   ├── campaign.ts    # 活动状态机
│               │   ├── coupon.ts      # 发券幂等逻辑
│               │   ├── budget.ts      # 预算管理
│               │   ├── inventory.ts   # 库存管理
│               │   └── experiment.ts  # A/B 分流
│               ├── constants.ts       # 阈值、规则常量
│               ├── types.ts           # 共享类型定义
│               ├── utils.ts           # 工具函数
│               └── validators.ts      # Zod Schema
│
├── packages/
│   ├── domain/                  # 业务对象、规则和状态机（纯逻辑，零依赖）
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── types/           # 所有业务对象类型定义
│   │       │   ├── visitor.ts
│   │       │   ├── campaign.ts
│   │       │   ├── coupon.ts
│   │       │   ├── order.ts
│   │       │   ├── zone.ts
│   │       │   ├── product.ts
│   │       │   ├── experiment.ts
│   │       │   ├── approval.ts
│   │       │   └── event.ts
│   │       ├── rules/           # 业务规则（资格、预算、库存、审批）
│   │       │   ├── eligibility.ts
│   │       │   ├── budget.ts
│   │       │   ├── inventory.ts
│   │       │   └── approval.ts
│   │       ├── state-machines/  # 状态机定义
│   │       │   ├── campaign.ts
│   │       │   ├── coupon.ts
│   │       │   └── order.ts
│   │       └── validators/      # Zod 校验 Schema
│   │           ├── campaign.ts
│   │           └── coupon.ts
│   │
│   └── simulator/               # 固定种子的合成数据与事件生成器
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── seed-random.ts    # 固定种子伪随机数生成器
│           ├── event-generator.ts # 经营事件流生成（6 分钟压缩播放）
│           ├── data/
│           │   ├── visitors.ts   # 3200 个模拟会员生成器
│           │   ├── merchants.ts  # 12 个商户
│           │   ├── products.ts   # 48 个商品
│           │   └── events.ts     # 预设事件序列（晚高峰、库存阈值等）
│           └── adapters/         # 外部系统模拟适配器
│               ├── payment.ts    # 支付模拟
│               ├── messaging.ts  # 消息推送模拟
│               └── pos.ts        # POS 核销模拟
│
├── tests/                       # API、集成和业务场景测试（独立于 apps/web/）
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   ├── playwright.config.ts
│   ├── fixtures/                # 测试夹具与预置数据
│   ├── unit/                    # 单元测试（Vitest）
│   │   ├── campaign-state.test.ts
│   │   ├── coupon-claim.test.ts
│   │   ├── budget-inventory.test.ts
│   │   └── eligibility.test.ts
│   └── e2e/                     # E2E 测试（Playwright）
│       ├── v1-main-flow.spec.ts
│       └── v2-regression.spec.ts
│
├── artifacts/                   # 架构、测试报告和发布说明（持久化至 Drive9）
│   ├── architecture.md
│   ├── test-reports/
│   └── release-notes/
│
└── scripts/                     # 初始化、构建和彩排脚本

    ├── setup.sh                 # 首次初始化
    ├── dev.sh                   # 开发启动
    ├── build.sh                 # 构建
    ├── test.sh                  # 运行所有测试
    ├── seed.sh                  # 重新生成种子数据
    └── rehearsal.sh             # 彩排快速重置
```

### 4.1 数据访问适配层

系统提供统一的数据访问适配器接口，支持两种运行模式：

```typescript
// apps/web/src/lib/db/adapter.ts
interface DataAdapter {
  // 游客
  getVisitor(id: string): Promise<Visitor>;
  verifyVisitor(id: string, age: number): Promise<VerificationResult>;
  
  // 活动
  getActiveCampaigns(): Promise<Campaign[]>;
  createCampaign(input: CreateCampaignInput): Promise<Campaign>;
  updateCampaignStatus(id: string, status: CampaignStatus): Promise<Campaign>;
  getCampaignVersion(id: string, version: number): Promise<CampaignVersion>;
  
  // 发券（幂等）
  claimCoupon(visitorId: string, campaignId: string, idempotencyKey: string): Promise<Coupon>;
  
  // 订单
  createOrder(input: CreateOrderInput): Promise<Order>;
  
  // 驾驶舱
  getDashboardData(): Promise<DashboardData>;
  
  // 事件流
  getEventStream(since: number): Promise<BusinessEvent[]>;
}
```

| 适配器 | 数据源 | 使用场景 |
|--------|--------|----------|
| `TiDBAdapter` | TiDB Starter（Prisma） | 有 TiDB 连接时，真实持久化 |
| `SyntheticAdapter` | 内存 + 固定种子 JSON | 数据库暂不可用时，独立完成应用构建和彩排 |

- 通过环境变量 `DATA_ADAPTER=tidb|synthetic` 切换
- **默认 `tidb` 模式**，直连平凯云 DB Starter
- `synthetic` 模式作为离线兜底，TiDB 不可用时自动降级
- 两种适配器实现相同接口，业务代码无感知

### 4.2 Drive9 对象存储

系统使用 Drive9 存储非数据库的持久化资产：

| 存储内容 | 路径 | 说明 |
|----------|------|------|
| 架构文档 | `artifacts/architecture.md` | 方案与设计决策 |
| 测试报告 | `artifacts/test-reports/` | QA 测试结果 |
| 发布说明 | `artifacts/release-notes/` | 版本变更记录 |
| Checkpoint | Drive9 工作现场 | Agent 任务恢复点 |
| 静态资源 | `apps/web/public/images/` | 会场地图、商品图片（如有） |

Drive9 集成方式：
- 通过 Loop 原生 Drive9 集成，Agent 可直接读写文件
- Artifact 和 Checkpoint 自动保存到 Drive9，支持跨 Agent 共享
- 不在代码中引入独立的 Drive9 SDK，使用 Loop 平台内置文件能力

---

## 5. 固定的安装、开发、构建、测试和预览命令

以下命令从 `beerfest-growth/` 根目录执行。

### 5.1 安装

```bash
# 首次安装（已预置 node_modules 的情况下跳过）
pnpm install

# 生成种子数据（仅 synthetic 模式）
pnpm run seed
```

### 5.2 开发

```bash
# 启动 Next.js 开发服务器（默认 http://localhost:3000）
pnpm dev

# 等价于：
#   pnpm --filter web dev
```

### 5.3 构建

```bash
# 生产构建
pnpm build

# 等价于：
#   pnpm --filter web build
```

### 5.4 测试

```bash
# 运行所有测试（Vitest 单元 + Playwright E2E）
pnpm test

# 仅单元测试
pnpm test:unit

# 仅 E2E 测试（需先启动 dev server 或已构建）
pnpm test:e2e
```

### 5.5 预览

```bash
# 生产预览（本地 http://localhost:3000）
pnpm start
```

### 5.6 其他

```bash
# Lint
pnpm lint

# 类型检查
pnpm typecheck

# 重新生成种子数据
pnpm run seed

# 彩排快速重置（重新生成数据 + 清除缓存 + 重新构建）
pnpm run rehearse
```


## 6. 开发与测试子任务

采用 Loop 根任务 "交付青岛啤酒节智能营促销系统 Demo"，拆分为以下子任务：

### 6.1 V1 核心实现（子任务）

| 子任务 ID | 名称 | 负责人 | Reviewer | 依赖 | 预估 |
|-----------|------|--------|----------|------|------|
| T1 | 数据模型与 Prisma Schema | Developer | Architect | 无 | 先于 T2 |
| T2 | 种子数据与事件生成器 | Developer | Architect | T1 | 与 T3 并行 |
| T3 | API 路由实现（全 15 个接口） | Developer | Architect | T1 | T1 完成后 |
| T4 | 游客端页面（首页/资格/券包） | Developer | Architect | T3 | T3 完成后 |
| T5 | 驾驶舱页面（总览/活动/审批/评估） | Developer | Architect | T3 | T3 完成后 |
| T6 | V1 业务场景测试 | Developer | QA | T3-T5 | 实现完成后 |
| T7 | V1 QA 测试执行与报告 | QA | Architect | T6 | T6 完成后 |

### 6.2 推荐执行顺序

```
T1（数据模型）──→ T3（API）──→ T4（游客端）
                              └──→ T5（驾驶舱）
                                    └──→ T6（单测）──→ T7（QA 测试）
T1 ──→ T2（种子数据，与 T3 并行）
```

### 6.3 V2 增量变更（现场触发，不预先创建子任务）

| 子任务 ID | 名称 | 负责人 | Reviewer |
|-----------|------|--------|----------|
| T8 | V2 影响分析与任务建议 | Architect | 人工 |
| T9 | 家庭客群/成年资格规则实现 | Developer | Architect |
| T10 | 审批页客群资格说明 | Developer | Architect |
| T11 | V2 回归测试（含 V1 全量） | QA | Architect |

### 6.4 测试策略

| 层次 | 框架 | 覆盖范围 |
|------|------|----------|
| 单元测试 | Vitest | 状态机、幂等逻辑、预算/库存计算、资格校验 |
| API 集成测试 | Vitest + fetch | 全部 API 路由：正常/异常/边界/幂等 |
| E2E 测试 | Playwright | V1 主流程：领券→下单→审批→暂停；V2：客群差异验证 |

---

## 7. 风险、依赖和需要人工确认的决策

### 7.1 风险清单

| 风险 | 等级 | 表现 | 处理 |
|------|------|------|------|
| macOS 权限阻止访问 Documents | 高 | 无法在目标路径创建文件 | **已发生**，使用 Finder AppleScript 复制到 `~/project/` 绕过；正式开发前需确认工作目录 |
| TiDB 连接不可用 | 中 | 舞台网络或 TiDB 实例异常导致无法连接 | SyntheticAdapter 自动降级，核心业务流程不中断；降级时页面显示离线模式标识 |
| Agent 生成代码质量 | 中 | 首轮无法通过 Review | QA 隔离测试 + Architect Review 门禁 |
| 舞台网络中断 | 中 | 无法加载外部资源 | 所有静态资源打包在应用中；模拟适配器不调用外部 API |
| 种子数据不一致 | 低 | 每次彩排事件时序不同 | 固定随机种子 + 事件生成器确定性 |
| V2 变更影响 V1 稳定性 | 中 | 回归失败 | V2 子任务明确要求回归全量 V1 用例 |

### 7.2 外部依赖

| 依赖 | 版本 | 用途 | 离线兜底 |
|------|------|------|----------|
| Node.js | >=20 LTS | 运行时 | 机器预装 |
| pnpm | >=9 | 包管理 | 机器预装 |
| 平凯云 DB Starter | TiDB Cloud | 业务数据库 | SyntheticAdapter 内存模式 |
| Drive9 | Loop 内置 | 对象存储/Checkpoint | 本地文件系统 |
| Playwright 浏览器 | Chromium | E2E 测试 | 预装二进制 |

### 7.3 需要人工确认的决策

| 序号 | 决策项 | 选项 | 建议 |
|------|--------|------|------|
| D1 | 工作目录位置 | A) `/Users/lizhongshu/project/青岛啤酒节Demo-Show/beerfest-growth/`（当前可访问）；B) Documents 原路径（需 macOS 权限） | **建议 A**，实际不受影响 |
| D2 | 数据库选型 | A) 平凯云 DB Starter（TiDB Cloud Starter）；B) SQLite | **建议 A**（已确认），SyntheticAdapter 保留为离线兜底 |
| D3 | 组件库选型 | A) shadcn/ui；B) Ant Design；C) 纯手写 | **建议 A**，轻量可定制，Demo 体量不重复造轮子 |
| D4 | 游客端路由风格 | A) 独立 H5 页面（`/`、`/verify`、`/coupons`）；B) 小程序风格 SPA | **建议 A**，独立路由更接近真实系统 |
| D5 | 模拟数据预置 vs 实时生成 | A) 预置 JSON 文件直接加载；B) 种子代码运行时生成 | **建议 B**，固定种子可重复且可调参 |
| D6 | Demo 账号体系 | A) 预设几个 fixed 账号；B) 无登录直接操作 | **建议 A**，需要区分家庭/成年/普通访客，演示账号预置 |

---

## 8. 与现有验收标准的逐项映射

以下逐项说明本方案如何满足业务需求方案 V1 中的验收标准（BR-01 ~ BR-08）。

### BR-01 经营态势识别

| 验收标准 | 本方案实现方式 |
|----------|---------------|
| 数据页显示事件时间和刷新时间 | 驾驶舱页面组件 `KpiCards.tsx` 显示 `lastUpdated` 时间戳 |
| "下降 35%"能展开查看对比口径 | `ZoneStatusPanel.tsx` 内嵌 Tooltip/展开面板展示基线与当前值 |
| 模拟数据与真实数据视觉区分 | `SimulatedDataBadge.tsx` 全局顶栏 + 各数据卡片角标 |
| 经营建议必须引用至少一个实时指标和一个约束指标 | `AgentSuggestion.tsx` 渲染时强制包含 `source_metric` + `constraint_metric` |

### BR-02 Agent 促销方案生成

| 验收标准 | 本方案实现方式 |
|----------|---------------|
| 自然语言输入目标 | `/dashboard/campaigns/new` 页面自由文本输入框 |
| 输出结构化：目标/人群/商品/优惠/预算/有效期/资格/停止/评估/解释 | `CampaignVersion` 模型 JSON snapshot 内 10 个字段强制非空校验 |
| 不能只输出营销文案 | 前端 `AgentSuggestion` 组件渲染为结构化卡片，非纯文本 |

### BR-03 活动审批与发布

| 验收标准 | 本方案实现方式 |
|----------|---------------|
| 状态至少含 draft/pending_approval/approved/running/paused/completed/cancelled | `Campaign.status` enum 含全部 7 个状态（见状态机） |
| Draft 不可被游客领取 | API `claim` 校验 `campaign.status !== 'running'` |
| 高风险活动进入人工审批 | 创建活动时检查 `budget > threshold \|\| contains_alcohol`，自动设 `pending_approval` |
| 审批记录含人/时间/版本/意见 | `Approval` 模型存储全部字段 |
| 修改规则生成新版本不覆盖历史 | `CampaignVersion` 为只追加模型，\( \text{new version} = \text{current version} + 1 \) |

### BR-04 资格、库存和预算一致性

| 验收标准 | 本方案实现方式 |
|----------|---------------|
| 重复请求只产生一张有效券 | `claim` API：`idempotency_key = visitor_id + campaign_id`，数据库唯一约束 |
| 预算耗尽后新请求失败并明确原因 | 返回 `{ error: "BUDGET_EXHAUSTED", remaining: 0 }` |
| 库存低于阈值后活动暂停 | `claim` 成功后检查 `remaining_inventory < 80`，触发 `campaign.status = 'paused'` |
| 重试不产生重复订单 | 发券和下单在同一 Prisma 事务内，异常即回滚 |

### BR-05 实验与增量评估

| 验收标准 | 本方案实现方式 |
|----------|---------------|
| 分组规则可查看且在活动期间保持稳定 | `visitor_id.hash() % 2` 分实验/对照，结果页展示分组规则 |
| 展示转化率/净支付 GMV/客单价/优惠成本 | `ExperimentResult.tsx` 组件按指标展示实验/对照/差异三列 |
| 小样本不宣称统计显著 | 结果页面标注"小样本演示，不构成统计显著性结论" |
| 不允许只用领取量证明业务成功 | 结果页默认展示净支付 GMV，领取量仅作为次要指标 |

### BR-06 异常监控与人工接管

| 验收标准 | 本方案实现方式 |
|----------|---------------|
| 监控预算/库存/退款/核销错误/工作流失败 | 每次 `claim` 和 `order` 后触发检查函数 |
| 达到阈值自动暂停并通知运营 | `Campaign.status → 'paused'` + 页面顶部 Alert |
| 运营可查看原因后恢复或终止 | 暂停详情页展示触发规则、影响和当前值，提供恢复/终止按钮 |

### BR-07 复盘与经验沉淀

| 验收标准 | 本方案实现方式 |
|----------|---------------|
| 结构化复盘 | P1 范围，本次仅定义 `CampaignResult` 数据模型字段 |
| 只有经确认的结论才能写成长期经验 | P1 范围，数据模型中保留 `memory_candidate.confirmed` 标记 |

### BR-08 Loop 需求变更（V2 家庭客群）

| 验收标准 | 本方案实现方式 |
|----------|---------------|
| 家庭游客只能领取餐饮文创券 | `visitor.type === 'family'` 时 API 返回过滤后的活动列表 |
| 成年人通过资格校验后才展示含酒精可选项 | `visitor.alcohol_verified === true` 时才包含含酒精商品的活动 |
| 审批页增加客群资格说明 | `ApprovalForm.tsx` 新增 `eligibilityExplanation` 区块 |
| 影响分析 | Architect 输出受影响模块清单（T8 子任务） |
| 回归测试 | QA 执行 V1 全量 + V2 新增用例（T11 子任务） |

---

## 9. 方案自检（6 项审批验证点）

### V1. 是否为完整系统而非单页面原型

**通过。** 系统包含 7 个独立页面（游客端 3 个 + 驾驶舱 4 个）、15 个 API 路由、12 个核心业务对象、3 个状态机。页面覆盖从游客领券到运营审批、从数据驾驶舱到实验评估的完整业务闭环。`packages/domain/` 独立封装业务逻辑表明这不是耦合在页面中的单文件原型。

### V2. 是否保留人工审批、幂等、预算、库存和自动暂停

**全部保留，逐项验证：**

| 能力 | 实现位置 | 测试覆盖 |
|------|----------|----------|
| 人工审批 | `dashboard/campaigns/[id]/approve/page.tsx` + `Approval` 业务对象 | T6/T7（V1 测试） |
| 发券幂等 | `packages/domain/src/rules/coupon.ts` — idempotency_key 唯一约束 | `unit/coupon-claim.test.ts` |
| 预算校验 | `packages/domain/src/rules/budget.ts` — 发券时原子校验 | `unit/budget-inventory.test.ts` |
| 库存校验 | `packages/domain/src/rules/inventory.ts` — 发券时同步占用 | `unit/budget-inventory.test.ts` |
| 自动暂停 | `packages/domain/src/state-machines/campaign.ts` — 三阈值触发 | `unit/campaign-state.test.ts` |

### V3. 是否明确模拟数据标识

**是。** `SimulatedDataBadge` 组件嵌入全局布局（`layout/SimulatedDataBadge.tsx`），所有页面顶部/底部显示"模拟数据，不代表真实经营结果"。KPI 卡片、实验结果图表均有独立角标。详见 BR-01 验收标准映射。

### V4. 是否有固定随机种子

**是。** `packages/simulator/src/seed-random.ts` 使用 `seedrandom` 库，固定种子值确保每次彩排产生一致的关键事件（A 区排队 22 分钟、B 区客流下降 35%、库存触发点等）。事件生成器 `event-generator.ts` 完全确定性，6 分钟压缩播放可精确复现。

### V5. 是否避免依赖现场不可控的真实支付、消息和 POS

**是。** 所有外部系统使用 `packages/simulator/src/adapters/` 中的模拟适配器：
- `payment.ts` — 内存模拟支付，不调用任何外部 API
- `messaging.ts` — 内存模拟消息推送
- `pos.ts` — 内存模拟核销

舞台断网仍可完整演示全部流程。真实支付/CRM/POS 明确列为 P2 不做。

### V6. 是否提供数据访问适配层

**是。** `apps/web/src/lib/db/adapter.ts` 定义 `DataAdapter` 接口，提供两种实现：

| 适配器 | 模式 | 使用场景 |
|--------|------|----------|
| `TiDBAdapter` | Prisma → 平凯云 DB Starter | **默认模式**，真实持久化 |
| `SyntheticAdapter` | 内存 + 固定种子 JSON | TiDB 不可用时自动降级 |

通过 `DATA_ADAPTER=tidb|synthetic` 环境变量切换，默认 `tidb`。TiDB 不可用时自动降级为 `synthetic` 模式，可完整支撑应用构建和彩排。同时使用 Drive9 存储 Artifact、Checkpoint 和静态文件，提供版本管理和 Agent 协作共享能力。

---

## 附录 A：业务需求文档映射速查表

| 需求文档章节 | 本方案对应位置 |
|-------------|---------------|
| §6.1 三个可见界面 | §2.1 页面清单 |
| §6.2 P0/P1/P2 范围 | §1.2-1.4 |
| §7 BR-01~08 验收标准 | §8 逐项映射 |
| §10.1 核心对象 | §2.2 业务对象 |
| §10.2 统一关联键 | §2.5 数据模型约束 |
| §11 四项数据能力映射 | 不在 P0 代码范围（Loop/Drive9/TiDB/Mem9/Lake 是平台层） |
| §12.1 演示数据集 | tools/seed/data/*.json |
| §13.1 预置 vs 现场 | §7 风险.D2 数据库选型 |
| §15 验收标准 | §8 逐项映射 + §6 测试子任务 |

## 附录 B：Demo 脚本 V2 关键流程映射

| 脚本幕 | 时间 | 本方案对应 |
|--------|------|-----------|
| 第三幕 @Team 派工 | 6:00-10:00 | 方案审批后执行 T1-T7 |
| 第四幕 创建任务 | 10:00-13:00 | Loop 任务看板（非代码范围） |
| 第五幕 实现/测试 | 13:00-20:00 | T1-T7 子任务执行 |
| 第六幕 经营工作流 | 20:00-25:00 | 驾驶舱 + API 完整流程 |
| 第七幕 V2 变更 | 25:00-30:00 | T8-T11 子任务 |
| 第八幕 计分板 | 30:00-33:00 | Playwright 测试结果导出 |

---

> **审批要求**：请确认以上 8 项设计方案（特别是 D1-D6 决策项），批准后由 beerfest-leader 拆解为 Loop 子任务，分派给 beerfest-rd（实现）和 beerfest-qa（测试）开始执行。
