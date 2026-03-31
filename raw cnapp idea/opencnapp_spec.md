# OpenCNAPP — Complete Build Specification
**Version:** 2.0 (Local-First, Multi-Cloud, Plugin Architecture)
**For:** AI agent handoff / developer implementation
**Context:** Open-source CNAPP platform built entirely on OSS tools, runs via Docker Compose, no cloud hosting required for the platform itself

---

## 1. PROJECT OVERVIEW

### What this is
A self-hosted, unified Cloud-Native Application Protection Platform (CNAPP) built from open-source security tools. Equivalent to commercial products like Wiz, Orca, or AccuKnox, but:
- Runs locally via Docker Compose (laptop, VM, or on-prem server)
- Zero licensing cost
- Every scanner is a plugin — users enable only what applies to them
- Multi-cloud: Azure, AWS, GCP all first-class
- No Kubernetes required (K8s support is an optional plugin)
- No CI/CD required (CI/CD integration is optional, tools also run standalone)

### Core problem being solved
Small-to-mid security teams cannot afford $50k–$200k/yr commercial CNAPP tools. All commercial tools are wrappers around these same open-source engines. This project builds the wrapper.

### Deployment options
| Option | Description | Who |
|--------|-------------|-----|
| A | `docker compose up` on developer laptop | Solo engineer |
| B | Ubuntu VM ($20/mo), internal team access | Team of 2–10 |
| C | Self-hosted server, Nginx + TLS, SSO | Larger team |
| D | Helm chart on K8s (optional) | K8s-first teams |

---

## 2. SECURITY DOMAINS COVERED

| Domain | Abbrev | Description | Requires Cloud | Requires K8s | CI/CD |
|--------|--------|-------------|---------------|-------------|-------|
| Cloud Security Posture Management | CSPM | Cloud resource misconfigs | Yes | No | Optional |
| Kubernetes Security Posture Management | KSPM | K8s cluster/workload posture | Optional | Yes | Optional |
| Cloud Workload Protection | CWPP | Real-time runtime threats | Optional | Optional | No |
| Cloud Identity & Entitlement Management | CIEM | Identity attack paths | Yes | No | No |
| Container Image Security | ImageSec | CVEs + secrets in images | Optional | Optional | Ideal |
| Infrastructure-as-Code Security | IaC | Misconfigs before deploy | No | No | Yes |
| Secrets Detection | Secrets | Keys/tokens in git repos | No | No | Ideal |
| SaaS Security Posture Management | SSPM | O365/GWS/SaaS posture | SaaS auth | No | No |
| Penetration Testing | Pentest | Active exploitation testing | Optional | Optional | Optional |
| Network Security | Network | Exposed ports, weak TLS | No | No | No |
| Compliance | Compliance | Framework mapping overlay | — | — | — |

---

## 3. COMPLETE TOOL INVENTORY

### CSPM Tools
| Tool | Clouds | Docker Image | Output Format | Run Mode |
|------|--------|--------------|---------------|----------|
| Prowler | AWS, Azure, GCP | `toniblyx/prowler:latest` | JSON/HTML/CSV | Scheduled |
| ScoutSuite | AWS, Azure, GCP, Alibaba | `rossja/ncc-scoutsuite:latest` | HTML/JSON | Scheduled |
| Steampipe | AWS, Azure, GCP, 100+ | `turbot/steampipe:latest` | JSON/CSV | Scheduled |
| CloudSploit | AWS, Azure, GCP | `aquasec/cloudsploit:latest` | JSON | Scheduled |

### KSPM Tools (K8s required)
| Tool | K8s Flavors | Docker Image | Output | Run Mode |
|------|-------------|--------------|--------|----------|
| Kubescape | AKS, EKS, GKE, self-hosted | `quay.io/kubescape/kubescape:latest` | JSON | Scheduled/Operator |
| Polaris | Any K8s | `quay.io/fairwinds/polaris:latest` | JSON + Web UI | Scheduled |
| kube-bench | Any K8s | `aquasec/kube-bench:latest` | JSON | On-demand |
| Trivy Operator | Any K8s | `aquasec/trivy-operator:latest` | CRDs/JSON | Continuous |
| KubeAudit | Any K8s | `shopify/kubeaudit:latest` | JSON | Scheduled |

### CWPP Tools
| Tool | Target | Docker Image | Run Mode | Notes |
|------|--------|--------------|----------|-------|
| Falco | K8s DaemonSet or Docker host | `falcosecurity/falco-no-driver:latest` | Continuous daemon | Linux only, needs privileged |
| Tracee | K8s or Linux host | `aquasec/tracee:latest` | Continuous | eBPF, alternative to Falco |
| Tetragon | K8s | `quay.io/cilium/tetragon:latest` | Continuous | Can enforce/kill |
| Wazuh | VM/bare-metal/Windows | `wazuh/wazuh-manager:latest` | Continuous | Non-container hosts |

### CIEM Tools
| Tool | Cloud | Docker Image | Output | Run Mode |
|------|-------|--------------|--------|----------|
| AzureHound + BloodHound CE | Azure/Entra ID | `ghcr.io/bloodhoundad/azurehound:latest` + `ghcr.io/specterops/bloodhound:latest` | Neo4j graph | Weekly |
| PMapper | AWS | `netspi/pmapper:latest` | JSON + graph | Weekly |
| Cartography | AWS, GCP, Azure | `lyft/cartography:latest` | Neo4j | Weekly |

### Image / IaC / Secrets Tools
| Tool | Domain | Docker Image | CI/CD? | Run Mode |
|------|--------|--------------|--------|----------|
| Trivy | Image + IaC + Secrets + K8s | `aquasec/trivy:latest` | Yes | CI/CD + Scheduled |
| Grype | Image CVEs | `anchore/grype:latest` | Yes | CI/CD |
| Syft | SBOM generation | `anchore/syft:latest` | Yes | CI/CD |
| Checkov | Terraform, Bicep, ARM, Helm, K8s YAML | `bridgecrew/checkov:latest` | Yes | CI/CD |
| KICS | Terraform, Docker, Ansible, CloudFormation | `checkmarx/kics:latest` | Yes | CI/CD |
| Gitleaks | Git repos | `zricethezav/gitleaks:latest` | Yes (pre-commit) | CI/CD + Scheduled |
| TruffleHog | Git history | `trufflesecurity/trufflehog:latest` | Yes | One-time + Monthly |
| detect-secrets | Git repos | n/a (Python pip) | Yes | CI/CD |

### SSPM Tools
| Tool | Target | How it runs | Run Mode |
|------|--------|-------------|----------|
| ScubaGear | Microsoft 365 / O365 | PowerShell container | Monthly |
| DragonFly | Google Workspace | Python | Monthly |

### Pentest / Active Scanning Tools
| Tool | Target | Docker Image | K8s? | Cloud? | Run Mode |
|------|--------|--------------|------|--------|----------|
| Nuclei | Web apps, APIs, cloud | `projectdiscovery/nuclei:latest` | No | Optional | On-demand + Weekly |
| kube-hunter | K8s clusters | `aquasec/kube-hunter:latest` | Required | No | On-demand + Weekly |
| CloudFox | AWS/Azure attack surface | `bishopfox/cloudfox:latest` | No | Required | On-demand + Monthly |
| Nmap | Network port scan | `instrumentisto/nmap:latest` | No | No | On-demand + Weekly |
| Naabu | Fast port scan | `projectdiscovery/naabu:latest` | No | No | On-demand + Weekly |
| Nikto | Web server scan | `frapsoft/nikto:latest` | No | No | On-demand + Monthly |
| SSLyze | TLS configuration | `nablac0d3/sslyze:latest` | No | No | Weekly |
| PMapper | AWS IAM privilege escalation | `netspi/pmapper:latest` | No | AWS | On-demand + Monthly |
| TruffleHog | Deep git secrets | `trufflesecurity/trufflehog:latest` | No | No | On-demand + Monthly |

---

## 4. SYSTEM ARCHITECTURE

### Stack
| Component | Technology | Purpose |
|-----------|-----------|---------|
| Platform runtime | Docker Compose | Run all services locally |
| Backend API | FastAPI (Python 3.11) | REST + WebSocket endpoints |
| Job queue | Redis + Celery | Async scanner job execution |
| Scheduler | APScheduler | Cron-based scanner triggers |
| Database | PostgreSQL 16 | Findings, config, history |
| Frontend | React + Vite (TypeScript) | Dashboard UI |
| Scanner runner | Docker SDK for Python | Spin up scanner containers |
| Normalizer | Python (per-tool adapters) | Unify tool outputs |

### Architecture layers (top to bottom)
```
┌─────────────────────────────────────────────────────────────────┐
│  CLOUD CONNECTORS           │  CI/CD PLUGINS                   │
│  Azure · AWS · GCP          │  GitHub Actions · Azure DevOps   │
│  K8s (optional)             │  GitLab · Jenkins                │
└─────────────────┬───────────┴──────────────┬────────────────────┘
                  │                           │
┌─────────────────▼───────────────────────────▼────────────────────┐
│  PLUGIN ENGINE — SCANNER REGISTRY                                │
│  Prowler │ Kubescape │ Falco │ BloodHound │ Trivy │ Nuclei ...   │
│  each = Docker image + normalizer adapter + schedule + config    │
└─────────────────────────────┬────────────────────────────────────┘
                               │
┌──────────────────────────────▼────────────────────────────────────┐
│  NORMALIZER SERVICE                                               │
│  tool output → { tool, domain, severity, cloud, resource_id,    │
│                  finding, remediation, frameworks[], ts }        │
└──────────────┬───────────────────────────────┬────────────────────┘
               │                               │
┌──────────────▼──────────────┐ ┌──────────────▼──────────────────┐
│  PostgreSQL                 │ │  Redis                          │
│  findings · scans           │ │  job queue · scan status       │
│  plugins · connectors       │ │  sessions · websocket          │
└──────────────┬──────────────┘ └──────────────┬──────────────────┘
               │     ┌──────────────────────┐  │
               │     │  Scheduler           │  │
               │     │  APScheduler crons   │  │
               │     │  → fire scanners     │  │
               │     └──────────────────────┘  │
               │     ┌──────────────────────┐  │
               │     │  Celery Workers      │  │
               │     │  UI-triggered jobs   ◄──┘
               │     └──────────────────────┘
               │                 │
┌──────────────▼─────────────────▼─────────────────────────────────┐
│  FastAPI Backend  :8080                                          │
│  /findings  /scans  /trigger-scan  /plugins  /connectors        │
│  /ingest  /webhook/falco  /ws/alerts  /reports                  │
└──────────────────────────────┬────────────────────────────────────┘
                               │
┌──────────────────────────────▼────────────────────────────────────┐
│  React Dashboard  :3000                                          │
│  Posture Overview │ Findings Explorer │ Pentest Runner          │
│  Plugin Manager   │ Connectors        │ Alerts & Rules          │
│  Compliance Reports                                              │
└───────────────────────────────────────────────────────────────────┘
```

---

## 5. PLUGIN SYSTEM SPECIFICATION

### Plugin manifest format (plugin.yaml)
Each plugin lives in `plugins/<tool-name>/plugin.yaml`:

```yaml
id: prowler
name: Prowler CSPM
domain: cspm                          # cspm|kspm|cwpp|ciem|image|iac|secrets|sspm|pentest|network
description: "500+ checks for AWS, Azure, GCP"
version: "4.x"

clouds_supported: [aws, azure, gcp]   # [] = cloud-agnostic
requires_k8s: false
requires_cicd: false
run_mode: scheduled                   # scheduled | on_demand | continuous

image: toniblyx/prowler:latest

config_schema:
  - key: CLOUD_PROVIDER
    label: Cloud provider
    type: select
    options: [aws, azure, gcp]
    required: true
  - key: AZURE_SUBSCRIPTION_ID
    label: Azure subscription ID
    type: string
    required_if: "CLOUD_PROVIDER == azure"

default_schedule: "0 */6 * * *"

command:
  - prowler
  - "{{ CLOUD_PROVIDER }}"
  - -M json
  - -o /output/results.json

output:
  format: json
  path: /output/results.json
  normalizer: prowler_normalizer

dashboard_widgets:
  - type: finding_count_by_check
  - type: severity_breakdown

tags: [cspm, azure, aws, gcp, cis-benchmark]
```

### Adding a new plugin (3 files only)
1. `plugins/<name>/plugin.yaml` — manifest (above format)
2. `plugins/<name>/normalizer.py` — ~50 lines, extends BaseNormalizer
3. Plugin is auto-discovered on API startup. No core code changes.

---

## 6. DATABASE SCHEMA

```sql
CREATE TABLE plugins (
  id           TEXT PRIMARY KEY,
  name         TEXT,
  domain       TEXT,
  version      TEXT,
  enabled      BOOLEAN DEFAULT FALSE,
  config       JSONB,              -- user-provided credentials/settings (encrypted)
  schedule     TEXT,               -- cron expression, overrides default
  run_mode     TEXT                -- scheduled|on_demand|continuous
);

CREATE TABLE connectors (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cloud        TEXT,              -- aws|azure|gcp|onprem|saas
  name         TEXT,              -- user-given name e.g. "prod-azure"
  credentials  JSONB,             -- AES-256 encrypted at rest
  metadata     JSONB,             -- subscription_id, account_id, region, etc.
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE scans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plugin_id     TEXT REFERENCES plugins(id),
  connector_id  UUID REFERENCES connectors(id),
  trigger       TEXT,             -- scheduled|manual|cicd|webhook
  status        TEXT,             -- queued|running|completed|failed
  started_at    TIMESTAMPTZ,
  finished_at   TIMESTAMPTZ,
  summary       JSONB             -- {critical:3, high:12, medium:45, low:20}
);

CREATE TABLE findings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id       UUID REFERENCES scans(id),
  plugin_id     TEXT,
  domain        TEXT,             -- cspm|kspm|cwpp|ciem|image|iac|secrets|sspm|pentest
  cloud         TEXT,             -- aws|azure|gcp|onprem|none
  severity      TEXT,             -- CRITICAL|HIGH|MEDIUM|LOW|INFO
  resource_type TEXT,
  resource_id   TEXT,
  resource_name TEXT,
  region        TEXT,
  check_id      TEXT,
  title         TEXT NOT NULL,
  description   TEXT,
  remediation   TEXT,
  references    JSONB,            -- [{url, title}]
  frameworks    TEXT[],           -- ['cis-1.4', 'pci-dss-3.2', 'soc2', 'iso27001']
  raw_output    JSONB,
  status        TEXT DEFAULT 'open',  -- open|acknowledged|suppressed|resolved
  assigned_to   TEXT,
  first_seen    TIMESTAMPTZ DEFAULT NOW(),
  last_seen     TIMESTAMPTZ DEFAULT NOW(),
  tags          TEXT[] DEFAULT '{}'
);

CREATE INDEX idx_findings_severity ON findings(severity);
CREATE INDEX idx_findings_domain   ON findings(domain);
CREATE INDEX idx_findings_status   ON findings(status);
CREATE INDEX idx_findings_cloud    ON findings(cloud);
CREATE INDEX idx_findings_last_seen ON findings(last_seen DESC);
```

---

## 7. API ENDPOINTS

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/findings` | List findings with filters: severity, domain, cloud, status, tool, page |
| GET | `/api/findings/{id}` | Single finding detail |
| PATCH | `/api/findings/{id}` | Update status/assignment |
| GET | `/api/scans` | List scans with status |
| POST | `/api/trigger-scan` | Trigger on-demand scan `{plugin_id, params}` |
| GET | `/api/scan-status/{id}` | Poll scan job status |
| POST | `/api/ingest` | Receive CI/CD results `{tool, trigger, data}` |
| POST | `/webhook/falco` | Receive Falco real-time alerts |
| GET | `/api/plugins` | List all plugins with enabled status |
| PATCH | `/api/plugins/{id}` | Enable/disable + configure plugin |
| GET | `/api/connectors` | List cloud connectors |
| POST | `/api/connectors` | Add new cloud connector |
| POST | `/api/connectors/{id}/test` | Test connector credentials |
| GET | `/api/dashboard/summary` | Aggregated risk score + counts |
| GET | `/api/reports/compliance` | Findings mapped to frameworks |
| WS | `/ws/alerts` | Real-time WebSocket: Falco alerts + scan completions |

---

## 8. THREE DATA FLOWS

### Flow 1: Scheduled scan
1. APScheduler fires cron trigger for enabled plugin
2. FastAPI pulls plugin config + connector credentials (decrypted)
3. Docker SDK runs scanner container with credentials injected as env vars
4. Scanner outputs JSON to shared volume `/output/{scan_id}/`
5. Normalizer adapter reads JSON → maps to common finding schema
6. Findings upserted to PostgreSQL (update last_seen if existing, insert if new)
7. Dashboard polling (every 30s) picks up new data

### Flow 2: UI-triggered on-demand scan (pentest)
1. User clicks "Run Nuclei" in dashboard, enters target URL
2. React → `POST /api/trigger-scan { plugin_id: "nuclei", params: { target: "..." } }`
3. FastAPI creates scan record (status=queued) → pushes job to Redis
4. Celery worker picks up job → Docker SDK runs scanner container
5. Scanner completes → output to shared volume → normalizer → PostgreSQL
6. Worker updates scan status → FastAPI broadcasts via WebSocket
7. Dashboard receives `{ event: "scan_complete", scan_id, count }` → shows report

### Flow 3: CI/CD pipeline push
1. PR opened / commit pushed → pipeline runs Trivy, Checkov, Gitleaks
2. Each tool outputs JSON artifact in pipeline
3. Pipeline step POSTs to `POST /api/ingest { tool: "trivy", trigger: "cicd", data: {...} }`
4. Normalizer processes → findings stored with trigger=cicd, commit SHA in tags
5. API responds with finding count summary
6. Pipeline can: (a) comment on PR with count, (b) fail if CRITICAL findings > 0

### Special: Falco real-time (continuous, not triggered)
- Falco runs as always-on daemon (DaemonSet on K8s OR privileged Docker container on host)
- Falcosidekick receives Falco events → forwards to `POST /webhook/falco`
- FastAPI normalizes → inserts as CRITICAL finding → broadcasts via WebSocket immediately
- No scheduler involved — always on, always pushing

---

## 9. INSTALLATION SEQUENCE

### Step 1: Prerequisites
```bash
# Required: Docker + Docker Compose
# Linux:
curl -fsSL https://get.docker.com | sh
# Mac: Docker Desktop
# Windows: Docker Desktop + WSL2
```

### Step 2: Clone and configure
```bash
git clone https://github.com/your-org/opencnapp
cd opencnapp
cp .env.example .env

# Minimum .env contents:
# POSTGRES_PASSWORD=<strong-password>
# REDIS_PASSWORD=<strong-password>
# SECRET_KEY=$(openssl rand -hex 32)
# ENCRYPTION_KEY=$(openssl rand -hex 32)
```

### Step 3: Start core platform
```bash
docker compose up -d core
# Dashboard at http://localhost:3000
# API at http://localhost:8080
# Default login: admin/changeme (prompted to change)
```

### Step 4: Add cloud connector (via UI or .env)
```bash
# Azure: create App Registration with Security Reader + Reader roles
az ad sp create-for-rbac --name "opencnapp-scanner" \
  --role "Security Reader" --scopes /subscriptions/SUBSCRIPTION_ID

# AWS: create IAM user with SecurityAudit + ReadOnlyAccess policies
aws iam create-user --user-name opencnapp-scanner
aws iam attach-user-policy --user-name opencnapp-scanner \
  --policy-arn arn:aws:iam::aws:policy/SecurityAudit
```

### Step 5: Enable scanners via UI Plugin Manager
```bash
# Or via Docker Compose profiles:
docker compose --profile prowler up -d    # CSPM
docker compose --profile falco up -d      # CWPP runtime
docker compose --profile bloodhound up -d # CIEM
docker compose --profile all up -d        # Everything
```

---

## 10. DOCKER COMPOSE STRUCTURE

```yaml
# Core services (always required)
services:
  postgres:    # PostgreSQL 16, port 5432 internal
  redis:       # Redis 7, internal only
  api:         # FastAPI :8080, Docker socket mounted
  worker:      # Celery worker, Docker socket mounted
  dashboard:   # React nginx :3000

# Optional profiles (enable per user need)
  falco:           # profiles: [falco, all]    -- Linux only
  falcosidekick:   # profiles: [falco, all]
  bloodhound-db:   # profiles: [bloodhound, all]
  bloodhound:      # profiles: [bloodhound, all]  -- UI :8888
  azurehound:      # profiles: [bloodhound, all]  -- collector, no-restart

# Volumes
  postgres-data    # persistent DB
  redis-data       # persistent cache
  bloodhound-neo4j # persistent graph
  scanner-output   # shared scanner JSON output
```

---

## 11. NORMALIZER PATTERN

```python
# normalizers/base.py
class BaseNormalizer(ABC):
    tool: str    # e.g. "prowler"
    domain: str  # e.g. "cspm"

    SEV_NORM = {
        # Prowler / generic
        "critical": "CRITICAL", "high": "HIGH", "medium": "MEDIUM",
        "low": "LOW", "informational": "INFO",
        # Falco
        "EMERGENCY": "CRITICAL", "ALERT": "CRITICAL",
        "WARNING": "HIGH", "NOTICE": "MEDIUM",
        # Kubescape
        "Critical": "CRITICAL", "High": "HIGH", "Medium": "MEDIUM",
    }

    def _base(self, scan_id: str) -> dict:
        return {
            "id": str(uuid.uuid4()),
            "scan_id": scan_id,
            "tool": self.tool,
            "domain": self.domain,
            "status": "open",
            "first_seen": datetime.now(timezone.utc).isoformat(),
            "last_seen":  datetime.now(timezone.utc).isoformat(),
        }

    def sev(self, raw: str) -> str:
        return self.SEV_NORM.get(raw, "INFO")

    @abstractmethod
    def normalize(self, raw_data, scan_id: str) -> List[dict]:
        ...
```

### Normalizers to implement (in order of priority)
1. `prowler.py` — CSPM, maps CheckId/Severity/ResourceId/Remediation
2. `falco.py` — CWPP, maps rule/priority/output_fields
3. `trivy.py` — Image/IaC, maps CVE ID/severity/target/description
4. `kubescape.py` — KSPM, maps controlName/severity/resource
5. `gitleaks.py` — Secrets, maps rule/match/file/commit
6. `checkov.py` — IaC, maps check_id/severity/resource/guideline
7. `nuclei.py` — Pentest, maps template-id/severity/host/info
8. `kube_hunter.py` — Pentest K8s, maps vulnerability/severity/location
9. `nmap.py` — Network, maps host/port/service/state
10. `scubagear.py` — SSPM, maps PolicyId/Requirement/Result

---

## 12. CI/CD INTEGRATION

### GitHub Actions (Trivy + Checkov + Gitleaks → OpenCNAPP)
```yaml
# .github/workflows/security.yml
name: Security Scan
on: [push, pull_request]
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }

      - name: Trivy IaC scan
        uses: aquasecurity/trivy-action@master
        with: { scan-type: config, format: json, output: trivy.json, exit-code: '0' }

      - name: Checkov
        uses: bridgecrew/checkov-action@master
        with: { output_format: json, output_file_path: checkov.json, soft_fail: true }

      - name: Gitleaks
        uses: gitleaks/gitleaks-action@v2
        continue-on-error: true

      - name: Send to OpenCNAPP
        run: |
          for tool in trivy checkov gitleaks; do
            [ -f "${tool}.json" ] && curl -s -X POST \
              "${{ secrets.OPENCNAPP_URL }}/api/ingest" \
              -H "Authorization: Bearer ${{ secrets.OPENCNAPP_TOKEN }}" \
              -d "{\"tool\":\"${tool}\",\"trigger\":\"cicd\",\"data\":$(cat ${tool}.json)}"
          done
```

### Azure DevOps equivalent
```yaml
# azure-pipelines.yml
steps:
  - script: |
      docker run --rm -v $(pwd):/src aquasec/trivy:latest config /src \
        --format json --output /src/trivy.json || true
    displayName: Trivy

  - script: |
      pip install checkov -q
      checkov -d . --output json --output-file checkov.json --soft-fail || true
    displayName: Checkov

  - script: |
      for tool in trivy checkov; do
        [ -f "${tool}.json" ] && curl -s -X POST "$(OPENCNAPP_URL)/api/ingest" \
          -H "Authorization: Bearer $(OPENCNAPP_TOKEN)" \
          -d "{\"tool\":\"${tool}\",\"data\":$(cat ${tool}.json)}"
      done
    displayName: Send to OpenCNAPP
```

---

## 13. DASHBOARD SCREENS

| Screen | Key components | Data source |
|--------|---------------|-------------|
| Posture Overview | Risk score (0–100), findings by severity (donut chart), findings by domain (bar), 30-day trend (line), per-cloud breakdown | `GET /api/dashboard/summary` |
| Findings Explorer | Unified table, filters (severity/domain/cloud/tool/status), search, detail panel with remediation, bulk actions | `GET /api/findings` |
| Pentest Runner | Available tools list, target input, Run Now button, live job status via WebSocket, formatted report on complete | `POST /api/trigger-scan` + `/ws/alerts` |
| Plugin Manager | Enable/disable toggle per tool, credential configuration form, schedule override, last scan + count | `GET/PATCH /api/plugins` |
| Connectors | Add Azure/AWS/GCP/K8s, credential test, multi-account support, encrypted storage | `GET/POST /api/connectors` |
| Alerts & Rules | Real-time Falco feed (WebSocket), notification rules (severity+domain → channel), Slack/Teams/email config | `GET /api/alerts` + `/ws/alerts` |
| Compliance Reports | Framework selector (CIS, PCI-DSS, SOC2, ISO27001), % compliant per control, export to PDF/CSV | `GET /api/reports/compliance` |

### Frontend tech stack
```
React 18 + Vite + TypeScript
Recharts          -- charts (posture overview)
@tanstack/react-query  -- data fetching + caching
@tanstack/react-table  -- findings table
zustand           -- state management
axios             -- API calls
react-router-dom  -- routing
```

---

## 14. SCAN SCHEDULES (DEFAULTS, USER-OVERRIDABLE)

| Plugin | Default Schedule | Rationale |
|--------|-----------------|-----------|
| Falco | Always-on daemon | Real-time runtime protection |
| Prowler (CSPM) | Every 6 hours | Cloud config changes frequently |
| Kubescape (KSPM) | Every 4 hours | K8s workloads deploy often |
| Trivy operator | Continuous (K8s operator) | New images deployed constantly |
| Gitleaks | Every commit (pre-commit) | Catch secrets at write-time |
| Checkov | Every PR | Catch IaC issues before merge |
| AzureHound / BloodHound | Weekly | Identity relationships slow to change |
| PMapper (AWS CIEM) | Weekly | IAM changes slowly |
| ScubaGear (SSPM) | Monthly | O365 config rarely changes |
| TruffleHog | One-time + Monthly | Deep history is slow |
| Nuclei | On-demand (+ weekly optional) | Active scan — user-triggered |
| kube-hunter | On-demand (+ weekly optional) | Active K8s attack simulation |
| CloudFox | On-demand (+ monthly optional) | Cloud attack surface mapping |
| SSLyze | Weekly | TLS certs expire, configs drift |

---

## 15. REPOSITORY STRUCTURE

```
opencnapp/
├── api/                          # FastAPI backend
│   ├── main.py                   # App entry point
│   ├── routes/
│   │   ├── findings.py
│   │   ├── scans.py
│   │   ├── webhooks.py           # /webhook/falco, /api/ingest
│   │   ├── plugins.py
│   │   ├── connectors.py
│   │   ├── dashboard.py
│   │   └── reports.py
│   ├── normalizers/
│   │   ├── base.py               # BaseNormalizer ABC
│   │   ├── prowler.py
│   │   ├── falco.py
│   │   ├── trivy.py
│   │   ├── kubescape.py
│   │   ├── gitleaks.py
│   │   ├── checkov.py
│   │   ├── nuclei.py
│   │   └── ...
│   ├── workers/
│   │   ├── app.py                # Celery app init
│   │   ├── scanner_runner.py     # Docker SDK runner
│   │   └── scheduler.py          # APScheduler setup
│   ├── database.py               # SQLAlchemy models + session
│   ├── crypto.py                 # Credential encryption/decryption
│   └── websocket.py              # WebSocket manager
│
├── dashboard/                    # React frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Overview.tsx
│   │   │   ├── Findings.tsx
│   │   │   ├── PentestRunner.tsx
│   │   │   ├── PluginManager.tsx
│   │   │   ├── Connectors.tsx
│   │   │   ├── Alerts.tsx
│   │   │   └── Compliance.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   │   └── useWebSocket.ts
│   │   └── api/
│   │       └── client.ts
│   └── package.json
│
├── plugins/                      # One directory per scanner
│   ├── prowler/
│   │   ├── plugin.yaml
│   │   └── normalizer.py         # (symlink to api/normalizers/prowler.py)
│   ├── kubescape/
│   ├── falco/
│   ├── trivy/
│   ├── gitleaks/
│   ├── checkov/
│   ├── nuclei/
│   ├── kube-hunter/
│   ├── bloodhound/
│   └── scubagear/
│
├── config/
│   ├── falco/
│   │   ├── falco.yaml
│   │   └── rules.d/
│   └── nginx/
│       └── nginx.conf            # For Option C deployment
│
├── docs/
│   ├── quickstart.md
│   ├── architecture.md
│   ├── adding-a-plugin.md
│   └── cloud-setup/
│       ├── azure.md
│       ├── aws.md
│       └── gcp.md
│
├── docker-compose.yml
├── .env.example
├── README.md
└── LICENSE                       # Apache 2.0
```

---

## 16. IMPLEMENTATION ROADMAP

### Phase 1 — Core platform (Week 1–2)
- [ ] Docker Compose: PostgreSQL, Redis, FastAPI skeleton, React skeleton
- [ ] Database schema (findings, scans, plugins, connectors)
- [ ] Plugin discovery system (auto-scan plugins/ directory on startup)
- [ ] Plugin Manager screen (enable/disable, configure)
- [ ] Connectors screen (add Azure/AWS/GCP, credential test)
- [ ] BaseNormalizer class

### Phase 2 — First scanners (Week 3–4)
- [ ] Prowler plugin + normalizer (CSPM — highest value)
- [ ] Gitleaks plugin + normalizer (Secrets — easy wins)
- [ ] Checkov plugin + normalizer (IaC)
- [ ] APScheduler cron trigger system
- [ ] Posture Overview screen (risk score, charts)
- [ ] CI/CD ingest endpoint (`POST /api/ingest`)
- [ ] Sample GitHub Actions + Azure DevOps YAML files

### Phase 3 — Runtime + Pentest (Week 5–6)
- [ ] Falco Docker Compose profile + Falcosidekick webhook
- [ ] WebSocket manager + real-time alert push
- [ ] Celery worker + Docker SDK scanner runner
- [ ] Pentest runner screen (Nuclei, Nmap, Nikto, SSLyze)
- [ ] Scan status polling + WebSocket scan-complete notification
- [ ] Alerts & notification rules screen

### Phase 4 — KSPM + CIEM (Week 7–8)
- [ ] Kubescape plugin (local kubeconfig + in-cluster webhook modes)
- [ ] Polaris plugin
- [ ] kube-hunter plugin (on-demand pentest)
- [ ] BloodHound CE Docker Compose profile
- [ ] AzureHound weekly collector
- [ ] PMapper for AWS CIEM
- [ ] CIEM view in dashboard

### Phase 5 — SSPM + Compliance (Week 9–10)
- [ ] ScubaGear plugin (PowerShell container)
- [ ] TruffleHog one-time + periodic plugin
- [ ] Compliance framework mapping (CIS, PCI-DSS, SOC2, ISO27001)
- [ ] Compliance reports screen
- [ ] Finding status workflow (open → ack → assigned → resolved)

### Phase 6 — Open-source release (Week 11–12)
- [ ] README with 15-min quickstart
- [ ] Plugin authoring guide
- [ ] Helm chart for K8s deployment option
- [ ] GitHub Actions: CI for normalizer unit tests
- [ ] Docker images to GitHub Container Registry
- [ ] Community contribution guide
- [ ] Launch

---

## 17. KEY DESIGN DECISIONS

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Platform hosting | Docker Compose (local) | Zero infrastructure cost, runs anywhere |
| API framework | FastAPI | Python ecosystem matches scanner tools, async WebSocket support |
| Job queue | Redis + Celery | Battle-tested, simple, lightweight |
| Database | PostgreSQL | JSONB for raw output, good indexing, free |
| Plugin architecture | YAML manifest + Python adapter | No core code changes for new tools |
| Scanner execution | Docker SDK (not K8s Jobs) | Works without K8s |
| Cloud credentials | Encrypted in PostgreSQL | No external secret manager required to start |
| Frontend | React + Vite | Fastest iteration, rich ecosystem |
| License | Apache 2.0 | Commercial-friendly, matches tool licenses |

---

## 18. WHAT THIS IS NOT

- Not a managed service (no cloud hosting)
- Not a commercial product with SLA
- Does NOT include: vendor threat intel feeds, ML-based anomaly detection, automatic remediation
- Does NOT require: cloud account, Kubernetes, CI/CD, any specific OS (except Falco needs Linux)
- The K8s Helm chart is an optional deployment method, not a requirement

---

*End of specification. Handoff complete.*
*Agent: implement in the order of the roadmap phases. Each phase is independently useful.*
