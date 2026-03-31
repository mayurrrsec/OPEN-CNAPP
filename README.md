 # OpenCNAPP
 
 OpenCNAPP is an open, local-first CNAPP platform that unifies posture, vulnerability, runtime, CI/CD, and native cloud-security findings in one system.
 
 ## 1) What you get
 - FastAPI backend for findings, scans, plugins, connectors, compliance, reports, auth, alerts/rules, attack paths, and native ingest.
 - Plugin-driven scanner model (YAML + adapter).
 - Multi-cloud connector model (Azure, AWS, GCP, Kubernetes, On-prem).
 - Celery + APScheduler orchestration with Docker-capable runner.
-- React dashboard with overview, findings explorer, alerts, attack paths, pentest runner, connectors and plugin manager.
+- React dashboard with overview, findings explorer, alerts, attack paths, pentest runner, connectors, and plugin manager.
 - Docker Compose profiles for core, runtime (Falco), and CIEM (BloodHound/AzureHound).
 - Helm chart baseline for Kubernetes deployment.
-- CI test workflow + GHCR publish + supply-chain SBOM/attestation baseline workflows.
 
-## 2) One-command setup
+## 2) Updating an existing VM clone (you already did `git clone`)
+If your VM already has this repo cloned, use the repo's default branch (`main`):
+
+```bash
+cd /path/to/OPEN-CNAPP
+git fetch --all --prune
+git checkout main
+git pull --rebase origin main
+```
+
+If you need to update a non-main branch, switch to it first:
+
+```bash
+git branch -a
+git checkout <your-branch>
+git pull --rebase origin <your-branch>
+```
+
+If you have local edits and want to keep them safely before updating:
+
+```bash
+git stash push -u -m "wip-before-update"
+git pull --rebase origin main
+git stash pop
+```
+
+## 3) One-command setup
+
+### Docker-enabled host (full stack)
 ```bash
 ./scripts/setup_opencnapp.sh
 ```
 
 Then open:
 - API docs: http://localhost:8000/docs
 - Dashboard: http://localhost:3000
 
-## 3) Deployment modes
+### No Docker available (local fallback)
+```bash
+./scripts/setup_opencnapp.sh --local
+```
+
+This installs backend/frontend deps, runs backend tests, and builds the dashboard.
+
+## 4) Deployment modes
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
 
-## 4) Architecture and plan mapping
-- Spec + roadmap source: `raw cnapp idea/opencnapp_final_spec_v3.md`
-- Final plan HTML: `raw cnapp idea/opencnapp_final_plan_v3.html`
+## 5) Architecture and plan mapping
+- Architecture assets directory (repo path): `raw cnapp idea/`
+  - GitHub folder: https://github.com/mayurrrsec/OPEN-CNAPP/tree/main/raw%20cnapp%20idea
+- Spec + roadmap source:
+  - repo path: `raw cnapp idea/opencnapp_final_spec_v3.md`
+  - GitHub URL: https://github.com/mayurrrsec/OPEN-CNAPP/blob/main/raw%20cnapp%20idea/opencnapp_final_spec_v3.md
+- Final plan HTML:
+  - repo path: `raw cnapp idea/opencnapp_final_plan_v3.html`
+  - GitHub URL: https://github.com/mayurrrsec/OPEN-CNAPP/blob/main/raw%20cnapp%20idea/opencnapp_final_plan_v3.html
 - Architecture diagrams:
-  - `raw cnapp idea/cnapp_architecture.svg`
-  - `raw cnapp idea/opencnapp_architecture.png`
+  - SVG repo path: `raw cnapp idea/cnapp_architecture.svg`
+  - PNG repo path: `raw cnapp idea/opencnapp_architecture.png`
+  - PNG GitHub URL: https://github.com/mayurrrsec/OPEN-CNAPP/blob/main/raw%20cnapp%20idea/opencnapp_architecture.png
 - How to use the plan in this repo: `docs/how-to-use-architecture-plan.md`
 - Roadmap completion status: `docs/roadmap-gap-analysis.md`
 
-## 5) API capabilities
+## 6) API capabilities
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
 
-## 6) Plugin model
+## 7) Plugin model
 To add a new tool:
 1. Create `plugins/<tool>/plugin.yaml`.
 2. Implement `api/adapters/<tool>.py`.
 3. Register it in `api/adapters/registry.py`.
 4. Sync plugins (`POST /plugins/sync`) or restart API.
 
-## 7) Resource requirements and OS support
+## 8) Resource requirements and OS support
 See: `docs/feasibility-and-requirements.md`
 
 Summary:
 - Linux/macOS/Windows(WSL2) supported.
 - Minimum: 4 vCPU / 8GB RAM / 20GB disk.
 - Recommended team setup: 8 vCPU / 16GB RAM / 100GB SSD.
 
-## 8) Security and operations notes
-- Credentials are encrypted at rest using `api/crypto.py`.
-- JWT auth included (local users); move to OIDC for enterprise SSO.
-- Supply-chain baseline workflow added (`.github/workflows/supply-chain.yml`).
-
 ## 9) CI/CD and release workflows
 - CI tests: `.github/workflows/ci.yml`
 - GHCR image publish: `.github/workflows/publish-ghcr.yml`
 - Supply-chain SBOM/attestation baseline: `.github/workflows/supply-chain.yml`
 
 ## 10) Docs index
 - Contributor guide: `docs/CONTRIBUTING.md`
 - Plugin authoring: `docs/adding-a-plugin.md`
 - Connector authoring: `docs/adding-a-connector.md`
 - CI/CD snippets: `docs/ci-cd-snippets.md`
 - Deep integration notes: `docs/deep-integration.md`
 - Launch checklist: `docs/launch-checklist.md`
-- codex/implement-full-opencnapp-architecture-dh0yai
-- codex/implement-full-opencnapp-architecture-lexq68
-- main
-
+- Architecture plan usage: `docs/how-to-use-architecture-plan.md`
+- Roadmap status: `docs/roadmap-gap-analysis.md`
 
 ## 11) Visual preview
 
-![OpenCNAPP architecture preview](raw cnapp idea/opencnapp_architecture.png)
-
-> Runtime UI screenshot capture is expected via browser tooling in environments where browser automation is available.
-
+![OpenCNAPP architecture preview](raw%20cnapp%20idea/opencnapp_architecture.png)
 
-## 12) ExecPlan workflow for future runs
-- Agent policy: `AGENTS.md`
-- ExecPlan template: `.agent/PLANS.md`
-- Create a task-specific plan before large changes and track validation evidence while implementing.
- codex/implement-full-opencnapp-architecture-dh0yai
-
-
-## 13) Troubleshooting
+## 12) Troubleshooting
+- **`error: pathspec 'work' did not match any file(s) known to git`**:
+  - The branch doesn't exist locally/remotely. Use `main` (or list branches with `git branch -a` and checkout an existing one).
 - **`[ERROR] Missing dependency: docker`** in setup script:
-  - Use Docker mode on a Docker-enabled host, or run fallback local mode:
+  - Run on a Docker-enabled host for full stack, or use:
     - `./scripts/setup_opencnapp.sh --local`
+- **`./scripts/setup_opencnapp.sh: line 6: ... No such file or directory`**:
+  - You're on an older/broken revision of the script. Update your clone:
+    - `git fetch --all --prune`
+    - `git checkout main`
+    - `git pull --rebase origin main`
 - **`ModuleNotFoundError: No module named 'api'`** while running tests:
   - Use `PYTHONPATH=. pytest -q` or `python -m unittest discover -s tests`.
-  - `pytest.ini` and `tests/conftest.py` are included to make root imports reliable.
-- If you previously generated local artifacts (`node_modules`, `dist`, `opencnapp.db`), they are now ignored via `.gitignore`.
-
-main
- 
