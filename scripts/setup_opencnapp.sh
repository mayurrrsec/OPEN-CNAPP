#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

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

check_cmd python3 || exit 1
check_cmd bash || exit 1

if [[ "$MODE" == "docker" ]]; then
  if ! check_cmd docker; then
    echo "[WARN] Docker not found. Falling back to local mode."
    MODE="local"
  fi
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

  # Compose mounts ./:/app — dashboard/node_modules on the host is what Vite sees.
  # Install here so pulls that add packages (e.g. @xyflow/react) work before first browser load.
  if command -v npm >/dev/null 2>&1; then
    if [[ -f dashboard/package-lock.json ]]; then
      echo "[INFO] Dashboard: npm ci (from package-lock.json)"
      (cd dashboard && npm ci) || { echo "[WARN] npm ci failed, trying npm install"; (cd dashboard && npm install); }
    elif [[ -f dashboard/package.json ]]; then
      echo "[INFO] Dashboard: npm install (no lockfile yet)"
      (cd dashboard && npm install)
    fi
  else
    echo "[WARN] npm not on PATH — the dashboard container runs npm install on start; "
    echo "         install Node.js/npm on the host for a faster, reproducible first-run."
  fi

  echo "[INFO] Pulling/building containers..."
  $COMPOSE build

  echo "[INFO] Starting OpenCNAPP core stack"
  $COMPOSE up -d postgres redis api worker dashboard

  echo "[INFO] Stack started"
  echo "  API docs:    http://localhost:8000/docs"
  echo "  Dashboard:   http://localhost:3000"
  echo ""
  echo "[INFO] After git pull: run 'cd dashboard && npm ci' (or npm install), then:"
  echo "       $COMPOSE up -d --build dashboard"
  echo "[INFO] Optional demo data (Postgres in Compose):"
  echo "       $COMPOSE exec api python scripts/seed_demo_data.py"
  echo "[INFO] Optional Compose profiles:"
  echo "       $COMPOSE --profile runtime up -d"
  echo "       $COMPOSE --profile ciem up -d"
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
if [[ -f dashboard/package-lock.json ]]; then
  (cd dashboard && npm ci) || (cd dashboard && npm install)
else
  (cd dashboard && npm install)
fi

echo "[INFO] Building dashboard"
(cd dashboard && npm run build)

echo "[INFO] Local mode complete. Start services manually:"
echo "  Backend:  PYTHONPATH=. python3 -m uvicorn api.main:app --host 127.0.0.1 --port 8000"
echo "  Frontend: cd dashboard && npm run dev -- --host 127.0.0.1 --port 3000"
