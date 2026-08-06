# 开发指南

## 项目架构

```
beerfest/
├── cmd/server/main.go          # 应用入口
├── internal/
│   ├── config/config.go        # 配置管理 + TLS 注册
│   ├── model/models.go         # 数据模型 (5 张核心表)
│   ├── handler/                # HTTP 处理器层
│   │   ├── activity.go         # 活动 CRUD + 状态机
│   │   ├── promotion.go        # 促销规则管理
│   │   ├── coupon.go           # 发券 + 核销
│   │   ├── segment.go          # 客户分群
│   │   ├── experiment.go       # A/B 实验
│   │   ├── dashboard.go        # 运营看板
│   │   └── simulator.go        # 模拟器
│   ├── service/                # 业务逻辑层
│   │   ├── activity.go, promotion.go, coupon.go
│   │   ├── segment.go, targeting.go
│   │   ├── experiment.go, dashboard.go
│   │   ├── simulator.go, suspend.go
│   │   └── approval.go
│   ├── repository/db.go        # DDL + 数据库初始化
│   ├── middleware/middleware.go # TraceID 中间件
│   └── adapter/mock.go         # 外部服务 Mock
├── docker/                     # 容器化配置
├── scripts/                    # 脚本工具
└── docs/                       # 项目文档
```

## 分层设计

```
Handler  → 解析请求、参数校验、调用 Service、返回响应
Service  → 业务逻辑、事务管理、规则引擎
Repository → 数据库操作、DDL 迁移
Model    → 数据结构定义
```

## 数据模型

### activities
| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(36) PK | UUID |
| name | VARCHAR(255) | 活动名称 |
| status | VARCHAR(20) | draft/active/paused/ended |
| start_time | DATETIME | 开始时间 |
| end_time | DATETIME | 结束时间 |
| workflow_id | VARCHAR(36) | 审批流 ID |
| trace_id | VARCHAR(36) | 追踪 ID |

### promotions
| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(36) PK | UUID |
| activity_id | VARCHAR(36) FK | 关联活动 |
| name | VARCHAR(255) | 促销名 |
| type | VARCHAR(20) | discount/coupon/bundle |
| rule | JSON | 规则配置 |
| priority | INT | 优先级 |

### coupons
| 字段 | 类型 | 说明 |
|------|------|------|
| code | VARCHAR(50) PK | 券码 |
| promotion_id | VARCHAR(36) FK | 关联促销 |
| user_id | VARCHAR(100) | 用户 ID |
| status | VARCHAR(20) | issued/used/expired |
| issued_at | DATETIME | 发放时间 |
| expires_at | DATETIME | 过期时间 |

### customer_segments
| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(36) PK | UUID |
| name | VARCHAR(255) | 分群名 |
| rules | JSON | 资格规则 |
| version | INT AUTO_INCREMENT | 规则版本号 |

### experiments
| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(36) PK | UUID |
| name | VARCHAR(255) | 实验名 |
| status | VARCHAR(20) | draft/running/completed |
| variants | JSON | 变体配置 |
| completed_at | DATETIME | 完成时间 |

## 状态机

### 活动状态
```
draft → active → paused → ended
         ↓         ↑
       paused -----┘
```

### 实验状态
```
draft → running → completed
```

## 开发流程

```bash
# 1. 安装依赖
go mod tidy

# 2. 编译
go build ./...

# 3. 代码检查
go vet ./...

# 4. 运行测试
go test ./...

# 5. 启动开发服务器
go run ./cmd/server/
```

## TraceID 追踪

每个请求自动注入三层追踪 ID:
- `X-Activity-ID` — 活动级追踪
- `X-Workflow-ID` — 工作流级追踪
- `X-Trace-ID` — 请求级追踪

## 原子操作

### 优惠券核销
```sql
UPDATE coupons SET status='used'
WHERE code=? AND status='issued' AND expires_at > NOW()
```
通过 `RowsAffected` 判断结果，防止并发双花和过期核销。

### 实验状态守卫
```sql
UPDATE experiments SET status='running' WHERE id=? AND status='draft'
```

## Mock 适配器

`internal/adapter/mock.go` 提供外部服务的 Mock 实现:
- Payment — 支付接口
- SMS — 短信通知
- POS — 收银终端

生产环境可替换为真实实现。
