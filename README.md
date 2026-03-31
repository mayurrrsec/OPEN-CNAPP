# OpenCNAPP

OpenCNAPP is a local-first, pluggable CNAPP platform that unifies findings from cloud scanners, runtime sensors, and CI/CD security tools into one dashboard.

## Quickstart

```bash
docker compose up --build
```

- API docs: http://localhost:8000/docs
- Dashboard: http://localhost:3000

## Implemented now
- FastAPI skeleton with required route modules
- Data layer + initial schema for findings/scans/plugins/connectors
- Plugin engine contracts + auto-discovery from `plugins/*/plugin.yaml`
- Scan orchestration wiring with Celery + APScheduler + runner task
- React dashboard skeleton with required pages
- Working normalizers for Prowler, Gitleaks, Checkov, Trivy ingest

## Next
- Real scanner container execution and raw-output collection
- JWT auth + RBAC
- Advanced UI charts/attack-path visualization
- Native cloud-security source ingestion (Defender/Security Hub/SCC)

- CI/CD snippets: `docs/ci-cd-snippets.md`

- Phase status tracker: `docs/phase-status.md`
