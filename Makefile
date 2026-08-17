# beerfest-api Makefile
.PHONY: build vet test up down verify deploy ci

build: ## compile Go sources
	go build ./...

vet: ## run go vet
	go vet ./...

test: ## run Go tests
	go test ./...

up: ## start the compose stack (TiDB Cloud mode, needs docker/.env)
	docker compose -f docker/docker-compose.yml up -d

dev: ## start the compose stack in local-MySQL dev mode (no .env needed)
	docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml up -d

down: ## stop the compose stack
	docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml down

verify: ## health-check the running API
	@curl -sf http://localhost:8080/api/v1/ping && echo " OK" || (echo " FAIL"; exit 1)

deploy: ## build + deploy + verify (see deploy.sh)
	./deploy.sh

ci: ## CI steps (mirrors .github/workflows/ci.yml)
	go build ./... && go vet ./... && go test ./...
