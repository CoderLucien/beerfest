# 啤酒节智能营促销系统

基于 Loop 多 Agent 协作平台构建的智能营销促销系统，为国际啤酒节提供活动管理、促销规则引擎、优惠券发放核销、客户分群、A/B 实验和运营看板等核心能力。

## 架构

```
┌─────────────────────────────────────────────┐
│                  Nginx (:80)                 │
│                   反代 + 静态页                │
├─────────────────────────────────────────────┤
│               Go + Gin API (:8080)            │
│  ┌─────────────────────────────────────────┐ │
│  │  handler → service → repository → TiDB  │ │
│  │           middleware (TraceID)           │ │
│  │           adapter (Mock Payment/SMS/POS) │ │
│  └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│         TiDB Starter (MySQL 协议)             │
│         Redis (:6379) — 缓存/会话              │
└─────────────────────────────────────────────┘
```

## 技术栈

| 层 | 技术 |
|---|------|
| 语言 | Go 1.22 |
| Web 框架 | Gin |
| 数据库 | TiDB Cloud Serverless (MySQL 协议, TLS 1.2) |
| 缓存 | Redis 7 |
| 容器化 | Docker + Docker Compose |
| CI/CD | GitHub Actions + deploy.sh |
| 反向代理 | Nginx |

## 项目结构

```
beerfest/
├── cmd/server/main.go          # 入口，TLS 注册
├── internal/
│   ├── config/config.go        # DB 配置 + TLS 注册
│   ├── model/models.go         # Activity, Promotion, Coupon, CustomerSegment, Experiment
│   ├── handler/                # REST API 处理器 (17 端点)
│   ├── service/                # 业务逻辑层
│   ├── repository/db.go        # DDL + 数据库初始化
│   ├── middleware/middleware.go # TraceID (activity/workflow/trace)
│   └── adapter/mock.go         # Mock Payment/SMS/POS
├── docker/
│   ├── Dockerfile              # 多阶段构建
│   ├── docker-compose.yml      # 服务编排
│   └── nginx.conf              # 反代配置
├── scripts/
│   ├── seed.go                 # 种子数据
│   └── demo-test.sh            # 业务流程测试脚本
├── .github/workflows/ci.yml    # CI (build + vet + test + docker)
├── deploy.sh                   # 一键部署
├── Makefile                    # build/vet/test/deploy 快捷命令
└── go.mod / go.sum
```

## 快速开始

### 前置条件

- Go 1.22+
- Docker + Docker Compose
- TiDB Starter 集群（或 MySQL 8.0+）

### 环境变量

```bash
cp .env.example .env
# 编辑 .env 填入 TiDB 连接信息：
# DB_HOST=your-tidb-host
# DB_PORT=4000
# DB_USER=your-user
# DB_PASS=your-password
# DB_NAME=beerfest
# DB_TLS=tidb
```

### 本地开发

```bash
# 安装依赖
go mod tidy

# 运行
go run ./cmd/server/

# 健康检查
curl http://localhost:8080/api/v1/ping
```

### Docker 部署

```bash
# 一键部署
./deploy.sh

# 或手动
docker compose up -d

# 验证
curl http://localhost/api/v1/ping
```

## API 端点

### 活动管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/activities` | 活动列表 |
| POST | `/api/v1/activities` | 创建活动 |
| GET | `/api/v1/activities/:id` | 活动详情 |
| PUT | `/api/v1/activities/:id` | 更新活动 |
| POST | `/api/v1/activities/:id/approve` | 审批活动 |
| POST | `/api/v1/activities/:id/suspend` | 暂停活动 |

活动状态机：`draft → active → paused → ended`

### 促销规则

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/activities/:id/promotions` | 活动促销列表 |
| POST | `/api/v1/activities/:id/promotions` | 创建促销规则 |
| GET | `/api/v1/promotions` | 全部促销规则 |

促销类型：`discount`（折扣）、`coupon`（优惠券）、`bundle`（套餐）

### 优惠券

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/coupons` | 发放优惠券 |
| POST | `/api/v1/coupons/:code/use` | 核销优惠券（原子操作） |
| GET | `/api/v1/coupons?user_id=xxx` | 用户券列表 |

### 客户分群 (V2)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/segments` | 分群列表 |
| POST | `/api/v1/segments` | 创建分群 |
| POST | `/api/v1/segments/:id/requalify` | 重算分群资格 |

### A/B 实验 (M4)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/experiments` | 实验列表 |
| POST | `/api/v1/experiments` | 创建实验 |
| POST | `/api/v1/experiments/:id/start` | 启动实验 |
| POST | `/api/v1/experiments/:id/complete` | 完成实验 |

### 模拟器 (M4)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/simulator/run` | 运行业务日模拟 |
| POST | `/api/v1/simulator/run-full` | 运行 14 天全场景 |

### 运营看板

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/dashboard/:activity_id` | 活动运营看板 |

### 健康检查

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/ping` | 服务健康检查 |

## 业务流程测试

```bash
curl -sL https://raw.githubusercontent.com/CoderLucien/beerfest/main/scripts/demo-test.sh | bash
```

10 步完整流程：健康检查 → 创建活动 → 折扣/优惠券/套餐促销 → 审批 → 发券 → 核销 → 客户分群 → A/B 实验 → 模拟器 → 运营看板。

## CI/CD

GitHub Actions 自动触发：push/PR 到 `main` 分支执行 `go build` + `go vet` + `go test` + Docker 镜像构建。

```bash
make ci          # 本地 CI 全流程
make build       # 仅编译
make vet         # 仅 vet
make test        # 仅测试
make deploy      # 一键部署
```

## Agent Team

本项目由 Loop 多 Agent 团队协作交付：

| Agent | 角色 | 职责 |
|-------|------|------|
| leader-cc-air3 | 团队协调 | 任务分配、进度追踪、里程碑管理 |
| beerfest-rd-cc-air3 | 全栈研发 | 架构设计、功能开发、代码交付 |
| beerfest-qa-cc-air3 | 质量保障 | 测试策略、回归验证、缺陷追踪 |
| dveops-cc-ubuntu | DevOps | 部署运维、CI/CD、环境管理 |

## 里程碑

| # | 里程碑 | 状态 |
|---|--------|------|
| M1 | Agent Team 配置与验证 | ✅ |
| M2 | V1 业务能力开发 | ✅ |
| M3 | V2 增量变更（客户分群） | ✅ |
| M4 | 合成数据与模拟器 | ✅ |
| M5 | 舞台彩排与上线 | 待启动 |

## License

MIT

## 文档

- [开发指南](docs/Development.md) — 架构、数据模型、状态机、开发流程
- [API 参考](docs/API-Reference.md) — 全部 REST API 端点及请求示例
- [部署指南](docs/Deployment.md) — Docker 部署、环境变量、TiDB 配置
