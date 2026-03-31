# Feasibility, OS Support, and Resource Requirements

## Supported OS
- Linux (Ubuntu 22.04+, Debian 12+, RHEL-compatible 9+): **recommended**
- macOS (Docker Desktop): supported for dev
- Windows 11 (WSL2 + Docker Desktop): supported for dev

## Required software
- Docker Engine 24+
- Docker Compose v2+
- Python 3.10+ (for local scripts/tests)
- Bash shell

## Minimum resources (POC)
- CPU: 4 vCPU
- RAM: 8 GB
- Disk: 20 GB

## Recommended resources (team)
- CPU: 8 vCPU
- RAM: 16 GB
- Disk: 100 GB SSD

## Ports used
- 3000: dashboard
- 8000: API
- 5432: PostgreSQL
- 6379: Redis
- 8080: BloodHound (optional profile)

## One-command setup
```bash
./scripts/setup_opencnapp.sh
```

## Deployment modes
- Core stack: `docker compose up -d`
- Runtime stack: `docker compose --profile runtime up -d`
- CIEM stack: `docker compose --profile ciem up -d`

## Feasibility notes
- Platform is local-first and can run on a single VM.
- Production scaling path: add workers, move to Helm/K8s, externalize secret management, add OIDC/RBAC.
