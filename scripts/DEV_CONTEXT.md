# Dev context — OpenCNAPP (for contributors & agents)

Use this when the shell **cwd** is wrong or you need to run commands without hunting paths.

## Repository root

The repo root contains **all** of:

- `api/` — FastAPI application
- `dashboard/` — Vite + React dashboard
- `docker-compose.yml`
- `README.md`

If you are in a subdirectory, go up until those exist:

```powershell
# PowerShell: from anywhere under the repo
Set-Location (git rev-parse --show-toplevel 2>$null); if (-not $?) { Write-Error "Not inside a git clone" }
```

```bash
# Bash / Git Bash / WSL
cd "$(git rev-parse --show-toplevel)"
```

## Layout (short)

| Path | Purpose |
|------|---------|
| `api/` | Backend: `main.py`, `routes/`, `connectors/`, `models/` |
| `dashboard/` | Frontend: `src/pages/`, `src/components/` |
| `dashboard/src/api/client.ts` | Axios instance + auth header |
| `plugins/` | Scanner plugin YAML + adapters |
| `deploy/` | Kubernetes manifests |
| `docs/` | Architecture, roadmap, **IMPLEMENTATION_STATUS.md** |
| `scripts/` | Setup and helper scripts |

## Common commands

### Full stack (Docker)

From **repo root**:

```bash
docker compose up -d
```

- API: `http://localhost:8000` (Swagger: `/docs`)
- Dashboard: `http://localhost:3000` (per `docker-compose.yml`; Vite may map 3000 → 5173 inside)

### Backend only (local venv)

From **repo root** (adjust venv activation for your OS):

```bash
cd api
# or: PYTHONPATH=. uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

Typical pattern used in this repo: run uvicorn with `PYTHONPATH` set to repo root so `import api` works.

### Dashboard only (local)

```bash
cd dashboard
npm install
npm run dev
```

Ensure `VITE_API_URL` (or default `http://localhost:8000` in `dashboard/src/api/client.ts`) matches your API.

### Quick checks

```bash
curl -s http://localhost:8000/health
```

### Dashboard production build

```bash
cd dashboard
npm run build
```

## Git branch

This repo may use feature branches (e.g. `feat/auth-sso-admin-users`). Before pushing:

```bash
git status
git branch -vv
```

## Troubleshooting

- **`ModuleNotFoundError: No module named 'api'`** — Run from repo root with `PYTHONPATH=.` or use the documented uvicorn invocation.
- **Wrong directory** — Run `git rev-parse --show-toplevel` and `Set-Location` / `cd` there.
- **Multiple clones** — Cursor “worktrees” may point at a different path than `C:\Users\...\OPEN-CNAPP`. Always `cd` to the clone that has your changes (`git status`).

## Helper script

See `scripts/dev-context.ps1` (Windows PowerShell) for a printed summary of the above.
