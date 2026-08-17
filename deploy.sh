#!/bin/bash
# beerfest-api deploy script — builds and deploys the stack on this host
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "ERROR: .env not found. Copy .env.example and fill in DB_* values." >&2
  exit 1
fi

echo "==> Building images"
docker compose -f docker/docker-compose.yml build

echo "==> Starting stack"
docker compose -f docker/docker-compose.yml up -d

echo "==> Waiting for API health (max 90s)"
for i in $(seq 1 30); do
  if curl -sf http://localhost:8080/api/v1/ping >/dev/null 2>&1; then
    echo "API healthy: $(curl -s http://localhost:8080/api/v1/ping)"
    break
  fi
  if [ "$i" = 30 ]; then
    echo "ERROR: API did not become healthy. Check 'docker compose logs api'." >&2
    exit 1
  fi
  sleep 3
done

echo "==> Stack status"
docker compose -f docker/docker-compose.yml ps
echo "==> Deploy OK"
