#!/usr/bin/env bash
set -euo pipefail

OS="$(uname -s)"
ARCH="$(uname -m)"

echo "[OpenCNAPP Setup] OS=$OS ARCH=$ARCH"

check_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "[ERROR] Missing dependency: $1"
    exit 1
  fi
}

check_cmd docker
check_cmd python3
check_cmd bash

if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  echo "[ERROR] Docker Compose not found"
  exit 1
fi

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "[INFO] Created .env from .env.example"
fi

echo "[INFO] Pulling/building containers..."
$COMPOSE build

echo "[INFO] Starting OpenCNAPP core stack"
$COMPOSE up -d postgres redis api worker dashboard

echo "[INFO] Stack started"
echo "API docs: http://localhost:8000/docs"
echo "Dashboard: http://localhost:3000"

echo "[INFO] Optional runtime profile: $COMPOSE --profile runtime up -d"
echo "[INFO] Optional CIEM profile: $COMPOSE --profile ciem up -d"
