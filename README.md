# OpenCNAPP

OpenCNAPP is a local-first, pluggable CNAPP platform that unifies findings from cloud scanners, runtime sensors, and CI/CD security tools into one dashboard.

## Quickstart

```bash
docker compose up --build
```

- API: http://localhost:8000/docs
- Dashboard: http://localhost:3000

## Architecture highlights
- FastAPI backend with normalized findings schema
- Plugin registry (`plugins/*/plugin.yaml`)
- Cloud connector model for Azure/AWS/GCP/Kubernetes/On-prem
- Celery + Redis scanning job queue
- React dashboard shell with core pages

## Repo structure
- `api/`: backend, adapters, connectors, workers, db models
- `dashboard/`: React + Vite UI
- `plugins/`: declarative plugin definitions
- `docs/`: implementation docs and cloud setup guides
