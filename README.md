# OpenCNAPP

OpenCNAPP is an open, local-first CNAPP platform that unifies posture, vulnerability, runtime, CI/CD, and native cloud-security findings in one system.

## 1) What you get
- FastAPI backend for findings, scans, plugins, connectors, compliance, reports, auth, alerts/rules, attack paths, and native ingest.
- Plugin-driven scanner model (YAML + adapter).
- Multi-cloud connector model (Azure, AWS, GCP, Kubernetes, On-prem).
- Celery + APScheduler orchestration with Docker-capable runner.
- **React (Vite) dashboard** — Orca/Wiz-style shell (dark sidebar, light main), unified posture home, domain pivots, command palette (**⌘K** / **Ctrl+K**), and charts driven by `/dashboard/summary`.
- **Findings Explorer** — TanStack Table with server-side pagination/sorting, filters, and a detail sheet with lifecycle form (React Hook Form + Zod).
- **Attack paths** — D3 force graph, top paths table with links to an **attack story** view (`/attack-paths/:pathId`) backed by `/attack-paths/story/{path_id}`.
- **Compliance** — framework rollup plus **control grid** (`/compliance/control-grid`) with severity columns and drilldown stub.
- Docker Compose profiles for core, runtime (Falco), and CIEM (BloodHound/AzureHound).
- Helm chart baseline for Kubernetes deployment.

### What landed on `main` (dashboard + API)
Foundation (Phase 1–2): Tailwind + design tokens, TanStack Query, Zustand theme, AppShell/Sidebar/Topbar, `UnifiedDashboard`, redirects from legacy routes, Recharts with `ResponsiveContainer`, safe JSON for `top_findings` on `/dashboard/summary`.

Follow-on: command palette, Findings table + sheet, attack story endpoint + detail route, compliance control grid, Vite `manualChunks`, PostCSS/Tailwind wiring, `.cursor/` gitignored.

### Feature branches / recent work (check your branch)
- **Auth & admin** — Login/session, protected API routes, user settings flows (as on `feat/auth-sso-admin-users` or similar).
- **Connectors + inventory (Phase 2 slice)** — Connector CRUD + enable/disable, `POST /connectors/test` (payload-based validation), **Add Cloud / Add Cluster / Add Registry** wizards in the dashboard, **Inventory** tabs (assets from findings aggregation). Details: **`docs/IMPLEMENTATION_STATUS.md`**.

**Process:** Prefer completing **one domain at a time** (e.g. CSPM, KSPM, registry scanning) before starting the next; see `docs/IMPLEMENTATION_STATUS.md` → “How we work from here”.

## 2) Updating an existing VM clone (you already did `git clone`)
If your VM already has this repo cloned, use the repo's default branch (`main`):

```bash
cd /path/to/OPEN-CNAPP
git fetch --all --prune
git checkout main
git pull --rebase origin main
```

If you need to update a non-main branch, switch to it first:

```bash
git branch -a
git checkout <your-branch>
git pull --rebase origin <your-branch>
```

If you have local edits and want to keep them safely before updating:

```bash
git stash push -u -m "wip-before-update"
git pull --rebase origin main
git stash pop
```

## 3) One-command setup

### Docker-enabled host (full stack)
```bash
./scripts/setup_opencnapp.sh
```

Then open:
- API docs: http://localhost:8000/docs
- Dashboard: http://localhost:3000

### Smoke-test after `docker compose up`
From the host (browser runs on your machine; the dashboard container exposes Vite on port **3000** → **5173** inside):

```bash
curl -s http://localhost:8000/health
curl -s "http://localhost:8000/dashboard/summary" | head -c 400
```

Then open **http://localhost:3000** — you should see the unified dashboard; use **Findings**, **Attack paths** (open an **Attack story** link if you have data), and **Compliance** (control grid loads when findings carry `compliance` tags).

If the dashboard shows API errors, confirm `VITE_API_URL` points to `http://localhost:8000` (default in `docker-compose.yml`) and that port **8000** is reachable.

### No Docker available (local fallback)
```bash
./scripts/setup_opencnapp.sh --local
```

This installs backend/frontend deps, runs backend tests, and builds the dashboard.

## 4) Deployment modes
### Core
```bash
docker compose up -d
```

### Runtime profile (Falco + Falcosidekick)
```bash
docker compose --profile runtime up -d
```

### CIEM profile (BloodHound + AzureHound)
```bash
docker compose --profile ciem up -d
```

## 5) Architecture and plan mapping
- Architecture assets directory (repo path): `raw cnapp idea/`
  - GitHub folder: https://github.com/mayurrrsec/OPEN-CNAPP/tree/main/raw%20cnapp%20idea
- Spec + roadmap source:
  - repo path: `raw cnapp idea/opencnapp_final_spec_v3.md`
  - GitHub URL: https://github.com/mayurrrsec/OPEN-CNAPP/blob/main/raw%20cnapp%20idea/opencnapp_final_spec_v3.md
- Final plan HTML:
  - repo path: `raw cnapp idea/opencnapp_final_plan_v3.html`
  - GitHub URL: https://github.com/mayurrrsec/OPEN-CNAPP/blob/main/raw%20cnapp%20idea/opencnapp_final_plan_v3.html
- Architecture diagrams:
  - SVG repo path: `raw cnapp idea/cnapp_architecture.svg`
  - PNG repo path: `raw cnapp idea/opencnapp_architecture.png`
  - PNG GitHub URL: https://github.com/mayurrrsec/OPEN-CNAPP/blob/main/raw%20cnapp%20idea/opencnapp_architecture.png
- How to use the plan in this repo: `docs/how-to-use-architecture-plan.md`
- Roadmap completion status: `docs/roadmap-gap-analysis.md`

## 6) API capabilities
- `/findings` list + filters + pagination/sort; `GET/PATCH /findings/{id}` lifecycle (status/assignment/ticket fields)
- `/ingest/{tool}` normalized ingest and fingerprint dedup
- `/native-ingest/{provider}` native security source ingest (AWS/Azure/GCP)
- `/scans` trigger/list scans (active-scan authorization gate)
- `/plugins` sync/list/enable/configure
- `/connectors` list/get/upsert/delete/patch + `POST /connectors/test` (validate credentials without saving) + `POST /connectors/{name}/test` + CI pull endpoints (sonarqube/zap/snyk)
- `/inventory/assets` aggregated asset rows from findings (until a dedicated asset table exists)
- `/dashboard/summary` posture KPIs, trends, severity/domain breakdown, top findings (JSON-safe)
- `/attack-paths` graph payload (nodes, edges, `top_paths` with `path_id`)
- `/attack-paths/story/{path_id}` narrative + risk for a single edge
- `/compliance/frameworks`, `/compliance/heatmap`, `/compliance/control-grid` (per-tag severity rollups)
- `/alerts/rules` + `/alerts/test` Apprise-backed notification rules
- `/reports/csv` + `/reports/pdf`
- `/auth/login` + `/auth/me`
- `/ws/alerts` + `/ws/scan-progress`

## 7) Plugin model
To add a new tool:
1. Create `plugins/<tool>/plugin.yaml`.
2. Implement `api/adapters/<tool>.py`.
3. Register it in `api/adapters/registry.py`.
4. Sync plugins (`POST /plugins/sync`) or restart API.

## 8) Resource requirements and OS support
See: `docs/feasibility-and-requirements.md`

Summary:
- Linux/macOS/Windows(WSL2) supported.
- Minimum: 4 vCPU / 8GB RAM / 20GB disk.
- Recommended team setup: 8 vCPU / 16GB RAM / 100GB SSD.

## 9) CI/CD and release workflows
- CI tests: `.github/workflows/ci.yml`
- GHCR image publish: `.github/workflows/publish-ghcr.yml`
- Supply-chain SBOM/attestation baseline: `.github/workflows/supply-chain.yml`

## 10) Roadmap (still to build)
See `docs/roadmap-gap-analysis.md` and `docs/execplans/opencnapp-v3-dashboard-and-platform.md`. Highlights: deeper **asset inventory**, global search wired to APIs, richer **attack-path** correlation, full **compliance control library** (pass/fail per control), **SSO**, and production-hardening of Compose/Kubernetes.

**What is actually implemented today** (vs plan intent) is tracked in **`docs/IMPLEMENTATION_STATUS.md`**, including known gaps such as real cloud SDK tests in `POST /connectors/test`, full org/Terraform onboarding UX, and remaining empty-state polish across all pages.

## 11) Docs index
- Contributor guide: `docs/CONTRIBUTING.md`
- **Implementation status (what exists now):** `docs/IMPLEMENTATION_STATUS.md`
- Developer/agent quick context (paths + commands): `scripts/DEV_CONTEXT.md`
- Plugin authoring: `docs/adding-a-plugin.md`
- Connector authoring: `docs/adding-a-connector.md`
- CI/CD snippets: `docs/ci-cd-snippets.md`
- Deep integration notes: `docs/deep-integration.md`
- Launch checklist: `docs/launch-checklist.md`
- Architecture plan usage: `docs/how-to-use-architecture-plan.md`
- Roadmap status: `docs/roadmap-gap-analysis.md`

## 12) Visual preview

![OpenCNAPP architecture preview](raw%20cnapp%20idea/opencnapp_architecture.png)

## 13) Troubleshooting
- **Wrong directory / wrong clone in Cursor** — From any folder inside the repo, run `git rev-parse --show-toplevel` and `cd` there. On Windows: `pwsh -File scripts/dev-context.ps1` prints `REPO_ROOT` and common commands. See `scripts/DEV_CONTEXT.md`.
- **I accidentally changed `README.md` in my PR branch and want to reset it**:
  - Restore only README from `origin/main`:
    - `git fetch origin`
    - `git checkout origin/main -- README.md`
    - `git commit -m "Restore README from main"`
- **`error: pathspec 'work' did not match any file(s) known to git`**:
  - The branch doesn't exist locally/remotely. Use `main` (or list branches with `git branch -a` and checkout an existing one).
- **`[ERROR] Missing dependency: docker`** in setup script:
  - Run on a Docker-enabled host for full stack, or use:
    - `./scripts/setup_opencnapp.sh --local`
- **`./scripts/setup_opencnapp.sh: line 6: ... No such file or directory`**:
  - You're on an older/broken revision of the script. Update your clone:
    - `git fetch --all --prune`
    - `git checkout main`
    - `git pull --rebase origin main`
- **`ModuleNotFoundError: No module named 'api'`** while running tests:
  - Use `PYTHONPATH=. pytest -q` or `python -m unittest discover -s tests`.
- **Docker image pull fails (`unexpected EOF`, timeout)**:
  - Retry `docker compose pull` or `docker compose build --no-cache`; check VPN/firewall; on Windows ensure Docker Desktop has enough disk/RAM.
