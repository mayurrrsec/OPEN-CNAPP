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
If your VM already has this repo cloned, use:

```bash
cd /path/to/OPEN-CNAPP
git fetch --all --prune
git checkout work
# or: git checkout <your-branch>
git pull --rebase origin work
```

If you have local edits and want to keep them safely before updating:

```bash
git stash push -u -m "wip-before-update"
git pull --rebase origin work
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

## 5) API capabilities
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

## 6) Plugin model
To add a new tool:
1. Create `plugins/<tool>/plugin.yaml`.
2. Implement `api/adapters/<tool>.py`.
3. Register it in `api/adapters/registry.py`.
4. Sync plugins (`POST /plugins/sync`) or restart API.

## 7) Resource requirements and OS support
See: `docs/feasibility-and-requirements.md`

Summary:
- Linux/macOS/Windows(WSL2) supported.
- Minimum: 4 vCPU / 8GB RAM / 20GB disk.
- Recommended team setup: 8 vCPU / 16GB RAM / 100GB SSD.

## 8) CI/CD and release workflows
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

![OpenCNAPP architecture preview](raw cnapp idea/opencnapp_architecture.png)

## 11) Troubleshooting
- **`[ERROR] Missing dependency: docker`** in setup script:
  - Run on a Docker-enabled host for full stack, or use:
    - `./scripts/setup_opencnapp.sh --local`
- **`ModuleNotFoundError: No module named 'api'`** while running tests:
  - Use `PYTHONPATH=. pytest -q` or `python -m unittest discover -s tests`.
