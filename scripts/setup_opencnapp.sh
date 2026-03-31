#!/usr/bin/env bash
set -euo pipefail

OS="$(uname -s)"
ARCH="$(uname -m)"
MODE="docker"
if [[ "${1:-}" == "--local" ]]; then
  MODE="local"
fi

echo "[OpenCNAPP Setup] OS=$OS ARCH=$ARCH MODE=$MODE"

check_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "[ERROR] Missing dependency: $1"
    return 1
  fi
}

if [[ "$MODE" == "docker" ]]; then
  if ! check_cmd docker; then
    echo "[WARN] Docker not found. Falling back to local mode."
    MODE="local"
  fi
fi

check_cmd python3 || exit 1
check_cmd bash || exit 1

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "[INFO] Created .env from .env.example"
fi

if [[ "$MODE" == "docker" ]]; then
  if docker compose version >/dev/null 2>&1; then
    COMPOSE="docker compose"
  elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE="docker-compose"
  else
    echo "[ERROR] Docker Compose not found"
    exit 1
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
  exit 0
fi

# local mode fallback
check_cmd pip || true
check_cmd npm || true

echo "[INFO] Installing backend dependencies"
python3 -m pip install -r api/requirements.txt

echo "[INFO] Running backend tests"
PYTHONPATH=. python3 -m unittest discover -s tests

echo "[INFO] Installing dashboard dependencies"
(cd dashboard && npm install)

echo "[INFO] Building dashboard"
(cd dashboard && npm run build)

echo "[INFO] Local mode complete. Start services manually:"
echo "  Backend: PYTHONPATH=. python3 -m uvicorn api.main:app --host 127.0.0.1 --port 8000"
echo "  Frontend: cd dashboard && npm run dev -- --host 127.0.0.1 --port 3000"
