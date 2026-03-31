# OpenCNAPP

OpenCNAPP is a local-first CNAPP platform with pluggable scanners, cloud-native ingest, unified findings schema, and an operations dashboard.

## Quick Start (End-to-End)

```bash
./scripts/setup_opencnapp.sh
```

Then open:
- API docs: http://localhost:8000/docs
- Dashboard: http://localhost:3000

## Architecture and Plan Mapping
- Final specification and roadmap source: `raw cnapp idea/opencnapp_final_spec_v3.md`
- Gap analysis and status by roadmap phase: `docs/roadmap-gap-analysis.md`
- Deep integration notes: `docs/deep-integration.md`

## What’s included
- FastAPI backend: findings, ingest, native-ingest, scans, plugins, connectors, dashboard, reports, compliance, auth, attack-paths, alerts/rules.
- Adapter ecosystem for CSPM/KSPM/CWPP/CIEM/CI tools.
- Celery + APScheduler orchestration with Docker-based runner support.
- React dashboard pages: Overview, Findings, Attack Paths, Alerts, Compliance, Pentest Runner, Plugins, Connectors.
- Optional runtime profile (Falco + Falcosidekick) and CIEM profile (BloodHound + AzureHound).
- Helm chart baseline and GitHub workflows for CI + GHCR publishing.

## How to use this with the architecture plan idea
1. Read roadmap section in the spec file.
2. Check implementation status in `docs/roadmap-gap-analysis.md`.
3. Use plugin model to add/extend tools:
   - Add `plugins/<tool>/plugin.yaml`
   - Add `api/adapters/<tool>.py`
4. Use connector model to onboard cloud credentials and optional native findings ingest.
5. Trigger scans via API or scheduler; inspect findings in UI.

## Operational guides
- Requirements + feasibility: `docs/feasibility-and-requirements.md`
- Contributor guide: `docs/CONTRIBUTING.md`
- Plugin authoring: `docs/adding-a-plugin.md`
- Connector authoring: `docs/adding-a-connector.md`
- CI/CD snippets: `docs/ci-cd-snippets.md`

## Profiles
- Core: `docker compose up -d`
- Runtime: `docker compose --profile runtime up -d`
- CIEM: `docker compose --profile ciem up -d`

- Architecture plan usage guide: `docs/how-to-use-architecture-plan.md`
- Feasibility and requirements: `docs/feasibility-and-requirements.md`
- One-command setup: `scripts/setup_opencnapp.sh`
