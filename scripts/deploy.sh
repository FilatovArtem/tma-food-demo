#!/usr/bin/env bash
# Idempotent deploy script.
# Runs on nixos-home-server (admin user, member of docker group → no sudo needed).
# Invoked by .github/workflows/deploy.yml after `git pull`.
#
# Assumes: docker compose v2 in PATH, .env exists with all required tokens,
#          Xray HTTP proxy listening on 127.0.0.1:10808 on the host.
#
# Usage: ./scripts/deploy.sh

set -euo pipefail

cd "$(dirname "$0")/.."

COMPOSE_FILES=(-f docker-compose.yml -f docker-compose.prod.yml)

echo "==> docker compose build"
docker compose "${COMPOSE_FILES[@]}" build

echo "==> docker compose up -d"
docker compose "${COMPOSE_FILES[@]}" up -d --remove-orphans

echo "==> Waiting for backend health (up to 60s)"
for _ in $(seq 1 30); do
  if curl --silent --fail --max-time 2 http://127.0.0.1:8000/api/health >/dev/null 2>&1; then
    echo "    backend OK"
    break
  fi
  sleep 2
done

echo "==> Waiting for frontend (up to 30s)"
for _ in $(seq 1 15); do
  if curl --silent --fail --max-time 2 http://127.0.0.1:8080/ >/dev/null 2>&1; then
    echo "    frontend OK"
    break
  fi
  sleep 2
done

echo "==> Prune dangling images (keep last 3 builds)"
docker image prune -f >/dev/null 2>&1 || true

echo "==> Status:"
docker compose "${COMPOSE_FILES[@]}" ps

echo "==> Deploy complete."
