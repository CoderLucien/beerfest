# 部署指南

## 环境要求

- Docker 20.10+
- Docker Compose 2.0+
- TiDB Starter 集群（或 MySQL 8.0+）

## 快速部署

### 1. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`:
```ini
DB_HOST=your-tidb-host
DB_PORT=4000
DB_USER=your-user
DB_PASS=your-password
DB_NAME=beerfest
DB_TLS=tidb
REDIS_HOST=redis
REDIS_PORT=6379
```

### 2. 一键部署

```bash
./deploy.sh
```

会自动执行：
1. `docker compose build` — 构建 API 镜像
2. `docker compose up -d` — 启动服务
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

## 常用命令

```bash
make build      # 编译
make vet        # 代码检查
make test       # 运行测试
make up         # 启动服务
make down       # 停止服务
make verify     # 验证部署状态
make deploy     # 一键部署
make ci         # 本地 CI 全流程
```

## TiDB 连接说明

本项目使用 TiDB Cloud Serverless，通过 MySQL 协议连接。

**关键配置项:**
- 端口: `4000`（非默认 3306）
- TLS: 必须启用 (`DB_TLS=tidb`)
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
| `DB_HOST` | - | TiDB 主机地址 |
| `DB_PORT` | 4000 | TiDB 端口 |
| `DB_USER` | - | 数据库用户 |
| `DB_PASS` | - | 数据库密码 |
| `DB_NAME` | beerfest | 数据库名 |
| `DB_TLS` | tidb | TLS 配置名 |
| `REDIS_HOST` | redis | Redis 主机 |
| `REDIS_PORT` | 6379 | Redis 端口 |
| `SERVER_PORT` | 8080 | API 端口 |
