# OpenCNAPP

OpenCNAPP is an open, local-first CNAPP platform that unifies posture, vulnerability, runtime, CI/CD, and native cloud-security findings in one system.

## 1) What you get
- FastAPI backend for findings, scans, plugins, connectors, compliance, reports, auth, alerts/rules, attack paths, and native ingest.
- Plugin-driven scanner model (YAML + adapter).
- Multi-cloud connector model (Azure, AWS, GCP, Kubernetes, On-prem).
- Celery + APScheduler orchestration with Docker-capable runner.
- React dashboard with overview, findings explorer, alerts, attack paths, pentest runner, connectors, and plugin manager.
- Docker Compose profiles for core, runtime (Falco), and CIEM (BloodHound/AzureHound).
- Helm chart baseline for Kubernetes deployment.

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
- `/findings` CRUD-ish lifecycle (status/assignment/ticket fields)
- `/ingest/{tool}` normalized ingest and fingerprint dedup
- `/native-ingest/{provider}` native security source ingest (AWS/Azure/GCP)
- `/scans` trigger/list scans (active-scan authorization gate)
- `/plugins` sync/list/enable/configure
- `/connectors` upsert/test + CI pull endpoints (sonarqube/zap/snyk)
- `/dashboard/summary` posture KPIs + trends
- `/attack-paths` risk-ranked path graph payload
- `/alerts/rules` + `/alerts/test` Apprise-backed notification rules
- `/reports/csv` + `/reports/pdf`
- `/compliance/heatmap`
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

## 9) Docs index
- Contributor guide: `docs/CONTRIBUTING.md`
- Plugin authoring: `docs/adding-a-plugin.md`
- Connector authoring: `docs/adding-a-connector.md`
- CI/CD snippets: `docs/ci-cd-snippets.md`
- Deep integration notes: `docs/deep-integration.md`
- Launch checklist: `docs/launch-checklist.md`
- Architecture plan usage: `docs/how-to-use-architecture-plan.md`
- Roadmap status: `docs/roadmap-gap-analysis.md`

## 10) Visual preview

![OpenCNAPP architecture preview](raw%20cnapp%20idea/opencnapp_architecture.png)

## 12) Troubleshooting
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
