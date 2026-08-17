# 部署指南

> 推荐部署路径：**TiDB Cloud Serverless**（生产/客户交付）；本地 MySQL 8 容器作为开发/试玩模式。
> 从零开始的完整步骤见 README「从零构建」章节，本文档聚焦环境变量与运维细节。

## 环境要求

- Docker 20.10+
- Docker Compose 2.0+（支持 `name:` 顶层字段与 healthcheck condition）
- 数据库二选一：TiDB Cloud Serverless 集群（推荐）或本地 MySQL 8（dev 模式）

## 快速部署

### 1. 配置环境变量

```bash
cp .env.example docker/.env
```

编辑 `docker/.env`:
```ini
DB_HOST=your-tidb-cloud-host
DB_PORT=4000
DB_USER=your_cluster_id.root
DB_PASSWORD=your_password
DB_NAME=beerfest
DB_TLS=tidb
# 可选：ADMIN_INIT_PASSWORD=xxx（不设置则启动日志打印随机一次性密码）
```

### 2. 一键部署

```bash
./deploy.sh
```

会自动执行：
1. `docker compose -f docker/docker-compose.yml build` — 构建 API 镜像
2. `docker compose -f docker/docker-compose.yml up -d` — 启动服务
3. 健康检查等待
4. 状态验证

### 3. 验证

```bash
curl http://localhost/api/v1/ping
# {"status":"ok"}
```

## 服务拓扑

| 服务 | 端口 | 说明 |
|------|------|------|
| api | 8080 | Go REST API |
| redis | 6379 | 缓存/会话 |
| nginx | 80 | 反向代理 + 静态页 |
| mysql（仅 dev 模式） | 3306 | 本地数据库 |

## 常用命令

```bash
make build      # 编译
make vet        # 代码检查
make test       # 运行测试
make up         # 启动服务（TiDB Cloud 模式）
make dev        # 启动服务（本地 MySQL dev 模式，无需 .env）
make down       # 停止服务
make verify     # 验证部署状态
make deploy     # 一键部署
make ci         # 本地 CI 全流程
```

## TiDB 连接说明

本项目推荐使用 TiDB Cloud Serverless，通过 MySQL 协议连接。

**关键配置项:**
- 端口: `4000`（非默认 3306）
- TLS: 启用 (`DB_TLS=tidb`，TiDB Cloud 连接串会提供 CA 证书)
- `multiStatements=true` 用于 DDL 迁移

**TLS 注册代码:**
```go
mysql.RegisterTLSConfig("tidb", &tls.Config{
    MinVersion: tls.VersionTLS12,
})
```

连接 DSN 格式:
```
user:password@tcp(host:port)/dbname?tls=tidb&parseTime=true&multiStatements=true
```

## 环境变量完整列表

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DB_HOST` | - | TiDB 主机地址（dev 模式为 `mysql`） |
| `DB_PORT` | 4000 | 数据库端口（dev 模式为 3306） |
| `DB_USER` | - | 数据库用户 |
| `DB_PASSWORD` | 无默认值，缺失则启动报错 | 数据库密码 |
| `DB_NAME` | beerfest | 数据库名 |
| `DB_TLS` | 空 | TLS 配置名（TiDB Cloud 填 `tidb`） |
| `REDIS_ADDR` | localhost:6379 | Redis 地址（compose 内为 `redis:6379`） |
| `PORT` | 8080 | API 监听端口 |
| `ADMIN_INIT_PASSWORD` | 空（随机生成一次性密码） | 管理员初始密码 |
| `LLM_API_KEY` | - | 运营问答 LLM 密钥（可选） |
| `LLM_BASE_URL` | - | LLM 接口地址（可选，默认腾讯混元） |
| `LLM_MODEL` | - | LLM 模型名（可选，默认 hunyuan-lite） |
