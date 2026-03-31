# OpenCNAPP — Final Complete Specification v3.0
**Status:** Final · Ready for implementation  
**Date:** 2026-03-31  
**Architecture:** Local-first · Multi-cloud · Pluggable · Industry-standard dashboard  
**License:** Apache 2.0

---

## Table of Contents
1. [Answers to All Open Questions](#1-answers-to-all-open-questions)
2. [What is ThreatMapper & How it Fits](#2-what-is-threatmapper--how-it-fits)
3. [Architecture — Final Version](#3-architecture--final-version)
4. [Cloud Connectors — All Clouds](#4-cloud-connectors--all-clouds)
5. [Native Security Tool Ingestion](#5-native-security-tool-ingestion-defender-security-hub-etc)
6. [Industry-Standard Dashboard Design](#6-industry-standard-dashboard-design)
7. [Complete Tool Registry](#7-complete-tool-registry)
8. [CI/CD Connector System](#8-cicd-connector-system)
9. [Common Findings Schema](#9-common-findings-schema)
10. [Scalability Design](#10-scalability-design)
11. [Docker Compose — Full Stack](#11-docker-compose--full-stack)
12. [Repository Structure](#12-repository-structure)
13. [Implementation Roadmap](#13-implementation-roadmap)
14. [Key Design Decisions](#14-key-design-decisions)

---

## 1. Answers to All Open Questions

### Q: Is the architecture scalable?
**Yes — by design.** The plugin architecture means adding a new tool, cloud, or connector never touches core code. The Docker Compose setup scales horizontally via multiple Celery workers. The PostgreSQL schema uses JSONB for raw output, indexed for fast querying across millions of findings. Scaling path:
- Phase 1 (1 person): single Docker Compose on a laptop or $20/mo VM
- Phase 2 (team): same compose + nginx + multiple worker replicas
- Phase 3 (enterprise): Helm chart on K8s with HPA on workers, read replicas on Postgres

### Q: Will the architecture support multiple deployment options later?
**Yes — all four options are designed in from day 1:**
- Option A: `docker compose up` on laptop (dev/solo)
- Option B: Ubuntu VM, internal access, team of 2–10
- Option C: self-hosted server, Nginx + TLS + LDAP/SSO
- Option D: Helm chart on K8s (optional — the platform itself doesn't require K8s to run)

### Q: Will we give connectors for all clouds?
**Yes — Azure, AWS, GCP, and on-prem all get first-class connectors.** Each connector is a Python class implementing the `CloudConnector` interface. Adding a new cloud = adding a new connector class + credential form in the UI. Alibaba Cloud and IBM Cloud are planned for v2 community contributions.

### Q: If another cloud-native security solution is enabled (Defender for Cloud, AWS Security Hub, etc.) — will findings show in our dashboard?
**Yes — via native security ingestion adapters.** If a user has Defender for Cloud enabled, we pull its recommendations via Azure API and normalize them into our schema. Same for AWS Security Hub, GCP Security Command Center. These are optional "bonus sources" that enrich findings — we don't replace them, we ingest them. Users see a "source" field showing whether a finding came from Prowler or Defender for Cloud or both.

### Q: Will the dashboard be industry standard?
**Yes — modelled after Wiz, Orca, and AccuKnox.** Key elements:
- Risk score / secure score (0–100)
- Attack path visualization (D3.js graph)
- Findings table with severity, domain, cloud, resource filters
- Trend charts (findings over time, by severity, by domain)
- Compliance heatmap (CIS, NIST, PCI-DSS, SOC2, ISO27001)
- Real-time alert feed (Falco/webhook events)
- Per-finding detail: title, description, remediation, compliance tags, raw output

### Q: What about ThreatMapper?
**ThreatMapper is a strong open-source CNAPP that we learn from and partially integrate with.** See Section 2 for full analysis.

### Q: What about SonarQube, ZAP, SBOM, and other CI/CD tools?
**All supported via the CI/CD Connector system.** Any tool that produces JSON output from CI/CD can be connected. Built-in adapters: SonarQube, OWASP ZAP, Trivy, Syft/Grype (SBOM), Gitleaks, Checkov, Semgrep, Snyk. See Section 8.

---

## 2. What is ThreatMapper & How it Fits

### What ThreatMapper is
ThreatMapper is an open-source, cloud-native application protection platform (CNAPP). It scans for vulnerabilities, malware, compliance misconfigurations, exposed secrets and prioritizes these critical cloud security alerts by exploitability. ThreatMapper works across all clouds and workload types — VMs, containers, Kubernetes, serverless, and more.

ThreatMapper uses a combination of agent-based inspection and agent-less monitoring to provide the widest possible coverage to detect threats. With ThreatMapper's ThreatGraph visualization, you can identify issues that present the greatest risk to the security of your applications, and prioritize these for planned protection or remediation.

The platform has a ThreatGraph that prioritizes risk points based on exploitability and simplifies complex compliance requirements for frameworks including CIS, PCI, HIPAA, GDPR, NIST, and SOC2.

### ThreatMapper vs OpenCNAPP — relationship

| Dimension | ThreatMapper | OpenCNAPP |
|-----------|-------------|-----------|
| What it is | A complete standalone CNAPP | A pluggable platform that wraps OSS tools |
| Deployment | Docker Compose (its own stack) | Docker Compose (your own stack) |
| Strength | ThreatGraph attack path viz, agent-based runtime | Plugin breadth, CI/CD ingest, cloud connectors |
| Runtime detection | Built-in agent | Falco / Tracee / Tetragon as plugins |
| Licensing | Apache 2.0 | Apache 2.0 |
| Dashboard | Built-in (rich UI) | Built by us (industry-standard) |

### Decision: use ThreatMapper as an optional plugin

**Option 1 (recommended for v1):** Add ThreatMapper as an optional plugin. Users who want its ThreatGraph visualization can spin it up as a sidecar Docker Compose profile. OpenCNAPP ingests its findings via its API.

**Option 2 (v2):** Implement our own lightweight ThreatGraph using D3.js force-directed graph, using the attack path data already in our Postgres schema. This gives us the same visualization without the ThreatMapper dependency.

**For now (v1):** ship an adapter that can import ThreatMapper findings into OpenCNAPP via ThreatMapper's REST API. Plugin declaration:
```yaml
plugins:
  threatmapper:
    display_name: "ThreatMapper (Deepfence)"
    domain: "cnapp"
    run_mode: "api_ingest"          # pulls from ThreatMapper API
    endpoint: "http://threatmapper:8080"
    normalizer: "adapters.threatmapper.normalize"
    dashboard_url: "http://threatmapper:8080"  # link-out to its native UI
    optional: true
```

---

## 3. Architecture — Final Version

```
╔═══════════════════════════════════════════════════════════════════════════╗
║  EXTERNAL SOURCES                                                         ║
╠═══════════════════════╦═══════════════════════╦═══════════════════════════╣
║  CLOUD CONNECTORS     ║  NATIVE SECURITY TOOLS║  CI/CD CONNECTORS         ║
║  ─────────────────    ║  ─────────────────     ║  ──────────────────────   ║
║  Azure / Entra ID     ║  Defender for Cloud   ║  GitHub Actions           ║
║  AWS                  ║  AWS Security Hub     ║  Azure DevOps             ║
║  GCP                  ║  GCP SCC              ║  GitLab CI                ║
║  K8s (optional)       ║  (all optional ingest)║  Jenkins                  ║
║  On-prem / bare-metal ║                       ║  SonarQube · ZAP · Snyk   ║
╚═══════════════════════╩═══════════════════════╩═══════════════════════════╝
                              │
                              ▼
╔═══════════════════════════════════════════════════════════════════════════╗
║  PLUGIN ENGINE — SCANNER REGISTRY (tools.yaml)                           ║
║  Each plugin: Docker image + normalizer adapter + schedule + cloud map   ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  CSPM          KSPM           CWPP              CIEM                      ║
║  Prowler       Kubescape      Falco             BloodHound+AzureHound     ║
║  ScoutSuite    kube-bench     Tracee            PMapper (AWS)             ║
║  Steampipe     Polaris        Tetragon          Cartography               ║
║  CloudSploit   KubeAudit      Wazuh             ThreatMapper (optional)   ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  IMAGE SEC     IaC / SECRETS  PENTEST/NETWORK   SSPM                     ║
║  Trivy         Checkov        Nuclei            ScubaGear (O365)          ║
║  Grype+Syft    KICS           Nmap / Naabu      DragonFly (GWS)           ║
║  TrivyOperator Gitleaks       kube-hunter                                 ║
║                TruffleHog     CloudFox                                    ║
║                detect-secrets SSLyze / Nikto                             ║
╚═══════════════════════════════════════════════════════════════════════════╝
                              │
                              ▼
╔═══════════════════════════════════════════════════════════════════════════╗
║  NORMALIZER SERVICE (Python adapters)                                    ║
║  Any tool output → unified Finding schema → PostgreSQL                   ║
╚══════════════════╦════════════════════════╦══════════════════════════════╝
                   │                        │
        ┌──────────▼──────────┐  ┌──────────▼─────────────┐
        │  PostgreSQL 16      │  │  Redis                 │
        │  findings · scans   │  │  job queue · sessions  │
        │  plugins · connectors│  │  WebSocket pub/sub     │
        └──────────┬──────────┘  └──────────┬─────────────┘
                   │   ┌────────────────┐   │
                   │   │  Scheduler     │   │
                   │   │  APScheduler   │   │
                   │   └────────────────┘   │
                   │   ┌────────────────┐   │
                   │   │  Celery Workers│◄──┘
                   │   │  (scan jobs)   │
                   │   └────────────────┘
                   │          │
                   ▼          ▼
╔═══════════════════════════════════════════════════════════════════════════╗
║  FastAPI Backend :8000                                                   ║
║  /findings  /scans  /trigger-scan  /plugins  /connectors  /ingest       ║
║  /webhook/falco  /ws/alerts  /ws/scan-progress  /reports  /compliance   ║
╚═══════════════════════════════════════════════════════════════════════════╝
                              │
                              ▼
╔═══════════════════════════════════════════════════════════════════════════╗
║  React Dashboard :3000  (industry-standard UI — see Section 6)          ║
╠═══════════╦═══════════╦═══════════╦═══════════╦═══════════╦═════════════╣
║  Posture  ║ Findings  ║  Attack   ║  Pentest  ║ Plugins & ║ Compliance  ║
║  Overview ║ Explorer  ║  Paths    ║  Runner   ║ Connectors║ Reports     ║
╚═══════════╩═══════════╩═══════════╩═══════════╩═══════════╩═════════════╝
```

---

## 4. Cloud Connectors — All Clouds

Each connector is a Python class implementing this interface:

```python
class CloudConnector:
    name: str                    # "azure" | "aws" | "gcp" | "onprem"
    display_name: str
    credential_fields: list[CredentialField]   # drives the UI form
    supported_plugins: list[str]

    def validate(self) -> ValidationResult: ...
    def get_scan_env(self) -> dict[str, str]: ...   # env vars for scanner containers
    def list_resources(self) -> list[Resource]: ...  # for asset inventory
    def ingest_native_findings(self) -> list[RawFinding]: ...  # Defender/Security Hub
```

### Connector Registry

| Connector | Credentials needed | Supported plugins | Native security tool |
|-----------|-------------------|-------------------|---------------------|
| **Azure** | Subscription ID, Tenant ID, Client ID/Secret or az login | Prowler, ScoutSuite, Steampipe, AzureHound, ScubaGear | Defender for Cloud (optional ingest) |
| **AWS** | Access Key + Secret, or IAM Role ARN | Prowler, ScoutSuite, Steampipe, PMapper, CloudFox | AWS Security Hub (optional ingest) |
| **GCP** | Service Account JSON | Prowler, ScoutSuite, Steampipe, Cartography | GCP Security Command Center (optional ingest) |
| **K8s** | kubeconfig path or in-cluster | Kubescape, kube-bench, Polaris, Falco, Trivy Operator | — |
| **On-prem/VM** | SSH key or agent install | Wazuh, Falco (binary), Nuclei, Nmap | — |
| **Git/SaaS** | GitHub/GitLab token | Gitleaks, TruffleHog, Checkov, KICS | — |
| **O365/M365** | Service Principal + Graph API | ScubaGear | — |
| **Google Workspace** | Service Account | DragonFly | — |

### Connector credential security

All credentials stored encrypted in PostgreSQL using AES-256. Key derived from `SECRET_KEY` in `.env`. Never logged. Never sent to external services. Mounted as environment variables into scanner containers at runtime and destroyed after the scan.

---

## 5. Native Security Tool Ingestion (Defender, Security Hub, etc.)

If a user has a commercial or cloud-native security product already enabled, OpenCNAPP ingests its findings as a supplemental source — it does NOT try to replace them.

### How ingestion works

```python
# On each scheduled run, the connector's ingest_native_findings() is called
# Azure example:
class AzureConnector(CloudConnector):
    def ingest_native_findings(self) -> list[RawFinding]:
        # Pull Defender for Cloud recommendations via Azure REST API
        # Only if user has enabled "Ingest from Defender for Cloud" in UI
        client = SecurityCenter(credential, subscription_id)
        alerts = client.alerts.list()
        return [RawFinding(source="defender_for_cloud", raw=a) for a in alerts]
```

### Native tool adapters

| Native tool | Cloud | Pull method | Finding source tag |
|-------------|-------|------------|-------------------|
| Defender for Cloud | Azure | Azure Security Center REST API | `defender_for_cloud` |
| AWS Security Hub | AWS | AWS SDK GetFindings | `aws_security_hub` |
| GCP Security Command Center | GCP | GCP SDK ListFindings | `gcp_scc` |
| Azure Sentinel (alerts) | Azure | Log Analytics API | `azure_sentinel` |
| Microsoft Entra ID Protection | Azure | MS Graph API | `entra_id_protection` |

### Deduplication

When the same resource has a finding from both Prowler and Defender for Cloud, OpenCNAPP deduplicates by `(resource_id, check_id)` and shows the finding once with `sources: ["prowler", "defender_for_cloud"]`. Users can filter by source in the findings table.

---

## 6. Industry-Standard Dashboard Design

Modelled after Wiz, Orca, AccuKnox, and Sysdig. Uses React + Recharts + D3.js.

### Page 1 — Posture Overview (home)
```
┌─────────────────────────────────────────────────────────────┐
│  Risk Score: 68/100        Last scan: 2h ago  [Run now]     │
├──────────┬──────────┬──────────┬──────────┬────────────────-┤
│ Critical │   High   │  Medium  │   Low    │  Resources      │
│    12    │    47    │   183    │   512    │   scanned: 341  │
├──────────┴──────────┴──────────┴──────────┴─────────────────┤
│  Findings by domain (bar chart)     │ Cloud breakdown       │
│  CSPM ████████████ 234              │  Azure  ██████ 180    │
│  KSPM ████████ 156                  │  AWS    ████   120    │
│  Secrets ████ 67                    │  GCP    ██    40      │
│  IaC ███ 55                         │                       │
│  Image ██ 44                        │                       │
├─────────────────────────────────────┴───────────────────────┤
│  Trend: findings over time (line chart, 30 days)            │
│  ──────────────────────────────────────────────────────     │
├──────────────────────────────────────────────────────────── ┤
│  Top 5 critical findings                                    │
│  ● Storage account allows public access      Azure  CRIT   │
│  ● K8s pod running as root                   K8s    CRIT   │
│  ● AWS S3 bucket public                      AWS    CRIT   │
└─────────────────────────────────────────────────────────────┘
```

### Page 2 — Findings Explorer
Full-featured table with columns: Severity · Domain · Tool · Cloud · Resource · Title · Status · Age
Filters: severity, domain, cloud, tool, status, compliance tag, assignee
Actions: assign, accept risk, create ticket (Jira/ServiceNow), mark fixed, bulk actions
Sort, export CSV/JSON

### Page 3 — Attack Path Visualization
D3.js force-directed graph showing:
- Nodes: resources (VM, storage, identity, K8s pod)
- Edges: relationships (can-access, vulnerable, over-privileged)
- Color: red=critical, amber=high, green=clean
- Click node → finding detail panel
- "Toxic combination" highlighting (same resource has vuln + public + over-privileged)
Modelled after Wiz Security Graph and ThreatMapper ThreatGraph.

### Page 4 — Pentest Runner
```
┌─────────────────────────────────────────────────────────┐
│  Active scan tools                                       │
│                                                         │
│  [Nuclei]  Target: https://app.example.com             │
│  Templates: cve, misconfig, exposure                    │
│  [I authorize this scan ☑]  [Run scan ▶]              │
│                                                         │
│  Recent pentest jobs                                    │
│  Nuclei   app.example.com   2h ago   42 findings       │
│  Nmap     10.0.0.0/24       1d ago   3 open ports      │
│  SSLyze   api.example.com   7d ago   1 weak cipher     │
└─────────────────────────────────────────────────────────┘
```

### Page 5 — Plugin Manager
Cards for each registered plugin. Toggle on/off. Configure schedule. Set credentials. Show last run time + finding count. Link to tool's native dashboard if it has one.

### Page 6 — Connectors + Clouds
Add/remove cloud connectors. Configure native tool ingestion. Test connection. View resource count.

### Page 7 — Compliance Reports
Framework selector: CIS Azure, CIS AWS, CIS K8s, NIST 800-53, PCI-DSS, SOC2, ISO27001, HIPAA
Heatmap: control domains × pass/fail/partial
Export PDF report
Per-control detail: which findings map to this control

### Page 8 — Alerts & Rules
Configure alert routing: Slack / Teams / email / PagerDuty / webhook
Alert rules: "CRITICAL finding from CSPM on Azure → Slack #security-alerts immediately"
Real-time alert feed (Falco / webhook events) with WebSocket stream

### Charts used (all from Recharts)
- `BarChart` — findings by domain, findings by cloud, top failing controls
- `LineChart` — findings trend over time, risk score trend
- `PieChart` / `DonutChart` — severity distribution, domain distribution
- `AreaChart` — scan frequency, alert volume over time
- `HeatmapChart` — compliance control heatmap (custom D3.js grid)
- `TreeMap` — resource risk surface map
- `ForceGraph` — attack path visualization (D3-force)

---

## 7. Complete Tool Registry

### CSPM
| Tool | Clouds | Docker image | Schedule | Dashboard? |
|------|--------|-------------|----------|-----------|
| Prowler | Azure · AWS · GCP | `toniblyx/prowler:latest` | Weekly | HTML report → ingested |
| ScoutSuite | Azure · AWS · GCP · Alibaba | `rossja/ncc-scoutsuite:latest` | Monthly | HTML report → ingested |
| Steampipe | Azure · AWS · GCP · 100+ | `turbot/steampipe:latest` | Weekly | No → ingested |
| CloudSploit | Azure · AWS · GCP | `aquasec/cloudsploit:latest` | Weekly | No → ingested |

### KSPM (K8s optional)
| Tool | Target | Docker image | Schedule |
|------|--------|-------------|----------|
| Kubescape | Any K8s | `quay.io/kubescape/kubescape:latest` | Weekly |
| kube-bench | Any K8s | `aquasec/kube-bench:latest` | Monthly |
| Polaris | Any K8s | `quay.io/fairwinds/polaris:latest` | Weekly |
| KubeAudit | Any K8s | `shopify/kubeaudit:latest` | Weekly |
| Trivy Operator | Any K8s | `aquasec/trivy-operator:latest` | Continuous |

### CWPP (runtime)
| Tool | Target | Run mode | Dashboard? |
|------|--------|----------|-----------|
| Falco | K8s DaemonSet / Linux host | Always-on daemon | Falcosidekick UI |
| Tracee | K8s / Linux (eBPF) | Always-on daemon | No → webhook ingested |
| Tetragon | K8s | Always-on daemon | No → webhook ingested |
| Wazuh | VM / bare-metal / Windows | Always-on agent | Wazuh web UI (link-out) |

### CIEM
| Tool | Cloud | Run mode |
|------|-------|----------|
| BloodHound CE + AzureHound | Azure / Entra ID | Weekly collector + BloodHound UI |
| PMapper | AWS | Weekly |
| Cartography | AWS · GCP · Azure | Weekly + Neo4j UI |

### Image / IaC / Secrets
| Tool | Domain | CI/CD? | Run mode |
|------|--------|--------|----------|
| Trivy | Image + IaC + Secrets + K8s | Yes | CI ingest or weekly scheduled |
| Grype + Syft | Image CVEs + SBOM | Yes | CI ingest |
| Checkov | Terraform · Bicep · Helm · K8s YAML | Yes | CI ingest |
| KICS | Terraform · Docker · Ansible · CF | Yes | CI ingest |
| Gitleaks | Git repos | Yes (pre-commit) | CI ingest + weekly |
| TruffleHog | Git history | Yes | One-time + monthly |
| detect-secrets | Git repos | Yes | CI ingest |

### SSPM
| Tool | Target | Run mode |
|------|--------|----------|
| ScubaGear | O365 / M365 | PowerShell container, monthly |
| DragonFly | Google Workspace | Python, monthly |

### Pentest / Active (on-demand + periodic)
| Tool | Target | Auth gate | Default schedule |
|------|--------|-----------|-----------------|
| Nuclei | Web apps · APIs · cloud | Required | On-demand + weekly optional |
| kube-hunter | K8s clusters | Required | On-demand + monthly |
| CloudFox | AWS · Azure attack surface | Required | On-demand + monthly |
| Nmap + Naabu | Network port scan | Required | On-demand + weekly |
| SSLyze | TLS endpoints | No | Weekly |
| Nikto | Web servers | Required | On-demand + monthly |
| ThreatMapper | All workloads | Optional plugin | Weekly |

---

## 8. CI/CD Connector System

Any tool that produces JSON output from CI/CD can push results to OpenCNAPP via the ingest API. No polling needed — CI pipeline POSTs after the scan.

### Ingest API endpoint
```
POST /api/ingest/{tool_name}
Authorization: Bearer {api_key}
Content-Type: application/json
```

### Built-in CI/CD adapters (v1)

| Tool | Domain | Adapter | Notes |
|------|--------|---------|-------|
| Trivy | Image sec + IaC | `adapters.trivy` | Already in your CI |
| Syft + Grype | SBOM + CVE | `adapters.grype` | Already in your CI |
| Gitleaks | Secrets | `adapters.gitleaks` | Add POST step |
| Checkov | IaC | `adapters.checkov` | Add POST step |
| KICS | IaC | `adapters.kics` | Add POST step |
| Semgrep | SAST | `adapters.semgrep` | Static analysis |
| detect-secrets | Secrets | `adapters.detect_secrets` | Pre-commit hook |

### CI/CD adapters (v2 — planned)

| Tool | Domain | Notes |
|------|--------|-------|
| **SonarQube** | SAST / code quality | Pull via SonarQube API or push JSON report |
| **OWASP ZAP** | DAST / web app scan | ZAP JSON report → POST /ingest/zap |
| **Snyk** | SCA + IaC | Snyk JSON report or API pull |
| **Burp Suite** | DAST | Burp XML/JSON report |
| **Dependency-Check** | SCA (OWASP) | JSON report |
| **SBOM ingest** | Dependency graph | SPDX or CycloneDX format |
| **Fortify / Veracode** | SAST (enterprise) | API pull |
| **Bandit** | Python SAST | JSON report |
| **npm audit / pip-audit** | Dependency vulns | JSON report |

### GitHub Actions integration
```yaml
# Add to any existing workflow after your scan step
- name: Send findings to OpenCNAPP
  run: |
    curl -X POST ${{ vars.OPENCNAPP_URL }}/api/ingest/trivy \
      -H "Authorization: Bearer ${{ secrets.OPENCNAPP_KEY }}" \
      -H "Content-Type: application/json" \
      --data-binary @trivy-results.json
```

### SonarQube integration (v2)
```yaml
# Option A: Pull mode — OpenCNAPP polls SonarQube API on schedule
connectors:
  sonarqube:
    url: "https://sonar.yourcompany.com"
    token: "{encrypted}"
    projects: ["myapp", "api-service"]
    schedule: "daily"

# Option B: Push mode — SonarQube webhook to OpenCNAPP
# In SonarQube: Project Settings → Webhooks → add:
# URL: https://opencnapp.yourcompany.com/api/ingest/sonarqube
# Secret: {your api key}
```

### ZAP integration (v2)
```yaml
# In CI pipeline after ZAP scan:
- name: Run ZAP baseline scan
  run: |
    docker run -v $(pwd):/zap/wrk/:rw \
      ghcr.io/zaproxy/zaproxy:stable \
      zap-baseline.py -t https://app.example.com \
      -J zap-report.json

- name: Send to OpenCNAPP
  run: |
    curl -X POST $OPENCNAPP_URL/api/ingest/zap \
      -H "Authorization: Bearer $OPENCNAPP_KEY" \
      --data-binary @zap-report.json
```

---

## 9. Common Findings Schema

The universal schema that ALL tools normalize into. Design it right — everything else follows.

```sql
CREATE TABLE findings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source
  tool            VARCHAR(50) NOT NULL,
  -- "prowler"|"kubescape"|"trivy"|"falco"|"checkov"|"nuclei"|
  -- "sonarqube"|"zap"|"gitleaks"|"defender_for_cloud"|"aws_security_hub"|...
  scan_id         UUID NOT NULL REFERENCES scans(id),
  source          VARCHAR(30) NOT NULL,
  -- "scheduled"|"ci_ingest"|"on_demand"|"webhook"|"native_ingest"

  -- Classification
  domain          VARCHAR(30) NOT NULL,
  -- "cspm"|"kspm"|"cwpp"|"ciem"|"image-sec"|"iac"|"secrets"|
  -- "sspm"|"pentest"|"sast"|"dast"|"sca"|"sbom"|"network"|"compliance"
  severity        VARCHAR(10) NOT NULL,
  -- "CRITICAL"|"HIGH"|"MEDIUM"|"LOW"|"INFO"
  cvss_score      FLOAT,
  cve_id          VARCHAR(30),

  -- Cloud context (all nullable — works without cloud)
  cloud_provider  VARCHAR(20),
  -- "azure"|"aws"|"gcp"|"k8s"|"onprem"|null
  account_id      VARCHAR(200),
  region          VARCHAR(100),
  resource_type   VARCHAR(200),
  resource_id     TEXT,
  resource_name   VARCHAR(500),
  namespace       VARCHAR(200),   -- K8s namespace

  -- Finding detail
  check_id        VARCHAR(200),   -- tool's native check identifier
  title           TEXT NOT NULL,
  description     TEXT,
  remediation     TEXT,
  references      JSONB,          -- [{url, title}]

  -- Compliance mapping
  compliance_tags VARCHAR(50)[],
  -- ["cis-azure-1.4", "pci-dss-3.2", "nist-800-53-AC-1", "soc2-cc6"]

  -- Lifecycle
  status          VARCHAR(30) DEFAULT 'open',
  -- "open"|"accepted_risk"|"false_positive"|"assigned"|"fixed"|"reopened"
  assignee        VARCHAR(200),
  ticket_url      TEXT,           -- Jira/ServiceNow ticket
  first_seen      TIMESTAMPTZ DEFAULT NOW(),
  last_seen       TIMESTAMPTZ DEFAULT NOW(),
  scanned_at      TIMESTAMPTZ NOT NULL,
  resolved_at     TIMESTAMPTZ,

  -- Deduplication
  fingerprint     VARCHAR(64),    -- SHA256(tool + check_id + resource_id)
  sources         VARCHAR(50)[],  -- if same finding from multiple tools

  -- Raw output
  raw_finding     JSONB
);

-- Indexes for common query patterns
CREATE INDEX idx_findings_severity      ON findings(severity);
CREATE INDEX idx_findings_domain        ON findings(domain);
CREATE INDEX idx_findings_cloud         ON findings(cloud_provider);
CREATE INDEX idx_findings_status        ON findings(status);
CREATE INDEX idx_findings_tool          ON findings(tool);
CREATE INDEX idx_findings_resource      ON findings(resource_id);
CREATE INDEX idx_findings_fingerprint   ON findings(fingerprint);
CREATE INDEX idx_findings_compliance    ON findings USING GIN(compliance_tags);
CREATE INDEX idx_findings_scanned_at    ON findings(scanned_at DESC);
```

---

## 10. Scalability Design

### What scales automatically
- **Celery workers**: add more worker containers to process scans faster
- **Postgres**: add read replicas for dashboard queries
- **Redis**: Redis Cluster for high scan volume
- **Scanner containers**: each scan spawns an isolated Docker container, parallelism = worker count

### Scaling path

```
Phase 1 — Solo engineer
  docker compose up  →  all on one machine  →  ~400MB RAM

Phase 2 — Team (2-10 people)  
  docker compose -f compose.team.yml up
  → adds nginx, 3x workers, external Postgres (optional)
  → ~1GB RAM, $20-40/mo VM

Phase 3 — Department (10+ people)
  docker compose -f compose.team.yml up --scale worker=5
  → 5 parallel scan workers
  → same compose file, just more workers

Phase 4 — Enterprise
  Helm chart on K8s
  → HPA on workers (scale based on Redis queue depth)
  → Managed Postgres (Azure Database, RDS, Cloud SQL)
  → All same code, same APIs
```

### What does NOT require re-architecture
- Adding a new tool: just a YAML + Python adapter
- Adding a new cloud: just a new connector class
- Adding a new CI/CD source: just a new ingest adapter
- More findings: Postgres handles millions of rows easily
- More users: stateless FastAPI, JWT auth, scales horizontally

---

## 11. Docker Compose — Full Stack

```yaml
# docker-compose.yml
version: '3.9'

services:
  # ── Data layer
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: opencnapp
      POSTGRES_USER: opencnapp
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./api/database/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U opencnapp"]

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru

  # ── Backend
  api:
    build: ./api
    restart: unless-stopped
    ports: ["8000:8000"]
    depends_on: { db: { condition: service_healthy }, redis: { condition: service_started } }
    env_file: .env
    volumes:
      - scan_data:/data/scans
      - /var/run/docker.sock:/var/run/docker.sock  # scanner runner needs this
      - ./plugins:/app/plugins:ro                   # plugin registry mount

  # ── Workers (scan execution)
  worker:
    build: ./api
    command: celery -A app.worker worker --loglevel=info --concurrency=4
    restart: unless-stopped
    depends_on: [db, redis]
    env_file: .env
    volumes:
      - scan_data:/data/scans
      - /var/run/docker.sock:/var/run/docker.sock
      - ./plugins:/app/plugins:ro

  # ── Scheduler (cron triggers)
  scheduler:
    build: ./api
    command: python -m app.workers.scheduler
    restart: unless-stopped
    depends_on: [db, redis]
    env_file: .env

  # ── Frontend
  ui:
    build: ./dashboard
    restart: unless-stopped
    ports: ["3000:80"]
    depends_on: [api]

  # ── Optional: Falco (CWPP runtime — Linux only)
  # Activate with: docker compose --profile cwpp up
  falco:
    profiles: ["cwpp"]
    image: falcosecurity/falco-no-driver:latest
    privileged: true
    pid: host
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /dev:/host/dev
      - /proc:/host/proc:ro
      - ./config/falco/falco.yaml:/etc/falco/falco.yaml
    environment:
      FALCOSIDEKICK_URL: http://api:8000/api/webhook/falco

  # ── Optional: BloodHound CE (CIEM — identity graphs)
  bloodhound:
    profiles: ["ciem"]
    image: ghcr.io/specterops/bloodhound:latest
    ports: ["8080:8080"]
    volumes: [bh_data:/data]

volumes:
  postgres_data:
  scan_data:
  bh_data:
```

---

## 12. Repository Structure

```
opencnapp/
├── api/                              # FastAPI backend
│   ├── main.py                       # App entry + lifespan
│   ├── routes/
│   │   ├── findings.py               # GET /findings, PATCH /findings/{id}
│   │   ├── scans.py                  # POST /scans/trigger, GET /scans
│   │   ├── ingest.py                 # POST /ingest/{tool} — CI/CD push
│   │   ├── webhooks.py               # POST /webhook/falco (real-time)
│   │   ├── plugins.py                # Plugin CRUD + enable/disable
│   │   ├── connectors.py             # Cloud connector CRUD + test
│   │   ├── dashboard.py              # Aggregated stats for UI
│   │   ├── compliance.py             # Compliance framework mapping
│   │   └── reports.py                # PDF/CSV export
│   ├── adapters/                     # One file per tool
│   │   ├── base.py                   # BaseAdapter ABC
│   │   ├── prowler.py
│   │   ├── kubescape.py
│   │   ├── falco.py
│   │   ├── trivy.py
│   │   ├── checkov.py
│   │   ├── gitleaks.py
│   │   ├── nuclei.py
│   │   ├── bloodhound.py
│   │   ├── sonarqube.py              # v2
│   │   ├── zap.py                    # v2
│   │   ├── defender_for_cloud.py     # native ingest
│   │   ├── aws_security_hub.py       # native ingest
│   │   ├── threatmapper.py           # optional plugin
│   │   └── ...
│   ├── connectors/                   # One file per cloud
│   │   ├── base.py
│   │   ├── azure.py
│   │   ├── aws.py
│   │   ├── gcp.py
│   │   ├── kubernetes.py
│   │   └── onprem.py
│   ├── workers/
│   │   ├── celery_app.py
│   │   ├── scanner_runner.py         # Docker SDK — runs tool containers
│   │   └── scheduler.py             # APScheduler cron setup
│   ├── models/                       # SQLAlchemy ORM models
│   │   ├── finding.py
│   │   ├── scan.py
│   │   ├── plugin.py
│   │   └── connector.py
│   ├── database/
│   │   └── init.sql                  # Schema creation
│   ├── crypto.py                     # AES-256 credential encryption
│   └── websocket.py                  # WebSocket manager
│
├── dashboard/                        # React frontend (TypeScript + Vite)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Overview.tsx          # Posture overview + score
│   │   │   ├── Findings.tsx          # Findings explorer table
│   │   │   ├── AttackPaths.tsx       # D3.js graph
│   │   │   ├── PentestRunner.tsx
│   │   │   ├── PluginManager.tsx
│   │   │   ├── Connectors.tsx
│   │   │   ├── Alerts.tsx
│   │   │   └── Compliance.tsx
│   │   ├── components/
│   │   │   ├── charts/               # Recharts wrappers
│   │   │   │   ├── SeverityDonut.tsx
│   │   │   │   ├── TrendLine.tsx
│   │   │   │   ├── DomainBar.tsx
│   │   │   │   └── ComplianceHeatmap.tsx
│   │   │   ├── FindingCard.tsx
│   │   │   ├── ScanProgress.tsx      # WebSocket progress
│   │   │   └── AlertFeed.tsx         # Real-time feed
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts
│   │   │   └── useFindings.ts
│   │   └── api/client.ts
│   └── package.json
│
├── plugins/                          # Plugin declarations
│   ├── prowler/plugin.yaml
│   ├── kubescape/plugin.yaml
│   ├── falco/plugin.yaml
│   ├── trivy/plugin.yaml
│   ├── checkov/plugin.yaml
│   ├── gitleaks/plugin.yaml
│   ├── nuclei/plugin.yaml
│   ├── bloodhound/plugin.yaml
│   ├── sonarqube/plugin.yaml         # v2
│   ├── zap/plugin.yaml               # v2
│   └── threatmapper/plugin.yaml      # optional
│
├── config/
│   ├── falco/falco.yaml
│   └── nginx/nginx.conf
│
├── docs/
│   ├── quickstart.md
│   ├── architecture.md
│   ├── adding-a-plugin.md
│   ├── adding-a-connector.md
│   ├── ci-cd-integration.md
│   └── cloud-setup/
│       ├── azure.md
│       ├── aws.md
│       ├── gcp.md
│       └── kubernetes.md
│
├── docker-compose.yml
├── .env.example
├── README.md
└── LICENSE
```

---

## 13. Implementation Roadmap

### Phase 1 — Foundation (weeks 1–2)
- [ ] Docker Compose: Postgres + Redis + FastAPI skeleton + React skeleton
- [ ] Database schema (`init.sql`)
- [ ] Plugin discovery (auto-scan `plugins/` dir on startup)
- [ ] Plugin Manager screen (enable/disable/configure)
- [ ] Cloud Connectors screen (add Azure/AWS/GCP, test credentials)
- [ ] `BaseAdapter` ABC + `BaseConnector` ABC
- [ ] `/api/ingest/{tool}` endpoint (CI/CD push)
- [ ] JWT auth (local users)

### Phase 2 — First scanners (weeks 3–4)
- [ ] Prowler plugin + normalizer (CSPM — Azure first, AWS second)
- [ ] Gitleaks plugin + normalizer (Secrets — quick wins)
- [ ] Checkov plugin + normalizer (IaC)
- [ ] Trivy CI ingest adapter (you already run it)
- [ ] Syft/Grype CI ingest adapter (you already run it)
- [ ] APScheduler cron trigger system
- [ ] Posture Overview screen (risk score, bar charts, donut, trend line)
- [ ] Findings Explorer screen (table + filters)
- [ ] GitHub Actions + Azure DevOps YAML snippets

### Phase 3 — Runtime + Pentest (weeks 5–6)
- [ ] Falco Docker Compose profile + Falcosidekick webhook integration
- [ ] WebSocket manager + real-time alert push to `AlertFeed`
- [ ] Celery worker + Docker SDK scanner runner
- [ ] Pentest Runner screen (Nuclei, Nmap, Nikto, SSLyze, CloudFox)
- [ ] Authorization gate for active scanning
- [ ] Kubescape plugin + normalizer (KSPM)
- [ ] kube-bench plugin
- [ ] Polaris plugin
- [ ] Alerts & Rules screen + Apprise notification dispatch

### Phase 4 — CIEM + Native Ingest + Attack Paths (weeks 7–8)
- [ ] BloodHound CE Docker Compose profile + AzureHound collector
- [ ] PMapper for AWS CIEM
- [ ] Defender for Cloud ingest adapter (Azure native)
- [ ] AWS Security Hub ingest adapter
- [ ] Deduplication engine (fingerprint-based)
- [ ] Attack Path visualization (D3.js force graph, basic version)
- [ ] kube-hunter plugin (on-demand)
- [ ] Wazuh integration (VM/bare-metal CWPP)

### Phase 5 — SSPM + Compliance + CI connectors (weeks 9–10)
- [ ] ScubaGear plugin (PowerShell container, O365)
- [ ] TruffleHog plugin
- [ ] Compliance framework mapping (CIS, PCI-DSS, SOC2, NIST, ISO27001)
- [ ] Compliance Reports screen (heatmap + PDF export)
- [ ] Finding lifecycle workflow (status, assign, ticket)
- [ ] SonarQube connector (pull mode + push webhook)
- [ ] OWASP ZAP ingest adapter
- [ ] Snyk ingest adapter
- [ ] SBOM ingest (CycloneDX/SPDX format)

### Phase 6 — Open-source release (weeks 11–12)
- [ ] README with 15-minute quickstart
- [ ] Plugin authoring guide (`docs/adding-a-plugin.md`)
- [ ] Connector authoring guide
- [ ] GitHub Actions CI: normalizer unit tests
- [ ] Docker images to GitHub Container Registry (ghcr.io)
- [ ] Helm chart (Option D deployment)
- [ ] Community contribution guide
- [ ] Launch on GitHub / ProductHunt / HackerNews

---

## 14. Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Platform hosting | Docker Compose local | Zero infra cost, any OS, open-source friendly |
| Plugin architecture | YAML manifest + Python adapter | New tool = 2 files, zero core changes |
| Scanner execution | Docker SDK (not K8s Jobs) | Works without K8s |
| Cloud credentials | AES-256 encrypted in Postgres | No external secret manager required |
| CI/CD integration | Webhook ingest (push) + API pull | Respects existing pipelines, no duplication |
| Native tool ingest | Optional adapters per product | Enrich findings, not replace commercial tools |
| Dashboard library | Recharts + D3.js | Recharts for standard charts, D3 for attack graph |
| Frontend | React + Vite + TypeScript | Fast iteration, rich ecosystem |
| Job queue | Redis + Celery | Battle-tested, simple |
| Database | PostgreSQL + JSONB | Structured findings + raw output preservation |
| Auth v1 | Local JWT | Zero external dependency |
| Auth v2 | OIDC (Azure AD / Okta) | Enterprise SSO when needed |
| License | Apache 2.0 | Commercial-friendly, matches tool licenses |
| ThreatMapper | Optional plugin + ingest adapter | Learn from it, don't depend on it |
| SonarQube/ZAP | v2 CI connectors | Shift-left security coverage |
| Scalability | Celery worker replicas | `--scale worker=N` with zero code change |

---

## Appendix — Plugin manifest format

```yaml
# plugins/prowler/plugin.yaml
name: prowler
display_name: "Prowler"
version: "4.x"
domain: cspm
clouds:
  - azure
  - aws
  - gcp
requires_k8s: false
run_mode: docker                       # docker | binary | k8s-job | webhook | api_ingest
image: toniblyx/prowler:latest
schedule: weekly                        # always-on | on-commit | hourly | daily | weekly | monthly | manual
normalizer: adapters.prowler.normalize
ci_compatible: false                    # can findings be pushed from CI?
ci_ingest_path: null
native_dashboard_url: null             # link-out if tool has its own UI
auth_gate_required: false              # for active scanning tools
enabled_by_default: true
description: "400+ checks across Azure, AWS, GCP for misconfigs, compliance, CIS benchmarks"
tags: [cspm, compliance, cis, nist, pci]
```

---

*End of specification — v3.0 final*  
*Implement in roadmap phase order. Each phase ships independently usable value.*  
*Agent handoff: start at Phase 1, `docker compose up` should work within the first day.*
