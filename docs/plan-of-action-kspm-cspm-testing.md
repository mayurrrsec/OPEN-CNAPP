# Plan of action — OpenCNAPP testing phase (KSPM → CSPM)

**Audience:** Management, **cloud team**, platform engineering, security engineering  
**Purpose:** Align on **what** we are testing, **why** it helps, **what** the **cloud team** must provide, **risk** to Azure subscriptions and billing, **how to deploy** the control plane, and **order of work** (KSPM first, then CSPM).

**Standalone document:** This file is written so stakeholders can use it **without** opening the full source tree. You still need the **OpenCNAPP project files** (checkout, release archive, or internal mirror) on the machine that runs the stack.

**Note:** OpenCNAPP is **open source** and **self-hosted**. There is **no vendor SaaS fee**; any **cost** is **your cloud and infrastructure** (compute, egress, optional Defender APIs, etc.).

---

## 1. Executive overview

### 1.1 What is this project?

**OpenCNAPP** is an open, **local-first CNAPP** (Cloud-Native Application Protection Platform) that brings together **posture, vulnerabilities, findings, connectors, and plugins** in one system. It is intended to unify visibility across **Kubernetes (KSPM)**, **cloud (CSPM)**, and other domains, with a **dashboard** and **APIs** under your control.

### 1.2 What we are implementing (testing scope)

| Phase | Focus | Goal of the test |
|-------|--------|-------------------|
| **Phase 1 (now)** | **KSPM** — Kubernetes Security Posture Management | Prove **cluster inventory**, **misconfiguration / scanner findings**, and **KSPM-oriented dashboards** against **cloud-team–managed AKS** (or equivalent) with acceptable risk and cost. |
| **Phase 2 (next)** | **CSPM** — Cloud Security Posture Management | Prove **cloud connector** workflows, **scoped** assessment (see **resource group** requirement below), and optional integration with **Microsoft Defender for Cloud** data. |

### 1.3 How this helps the organization

- **Single pane** for security findings from **Kubernetes** and (later) **Azure**, tied to **your** connectors and policies — not locked to one vendor UI.
- **Repeatable testing** of **KSPM then CSPM** in a controlled way, with **documented** permissions and blast radius.
- **Open architecture**: you can add **plugins** (e.g. Kubescape, kube-bench, cloud scanners) and **ingest** paths without replacing Defender or AKS — **complementary**, not mandatory replacement.

---

## 2. Plugins & tools (KSPM vs CSPM)

Packaged plugins are defined under **`plugins/<name>/plugin.yaml`** in the project and are **synced** into the database (Plugin manager). **Which tools run** in practice depends on **enabling** the plugin, **triggering** a scan, and having a **runner** (Docker + Celery on the worker, which mounts **`/var/run/docker.sock`** in the default Compose layout) or **`POST /ingest/{tool}`** available.

### 2.1 KSPM-oriented plugins (Kubernetes posture)

| Plugin (folder) | `domain` in `plugin.yaml` | Typical use |
|-----------------|----------------------------|-------------|
| **kube-bench** | `kspm` | CIS Kubernetes Benchmark checks |
| **kube-hunter** | `kspm` | Active probing of the cluster API (**higher risk** — use only in non-prod / with approval) |
| **polaris** | `kspm` | Best-practice / policy checks on workloads |
| **kubescape** | `cnapp` | Broad Kubernetes posture & compliance (often used for KSPM workflows) |

The **Kubernetes connector** also references **`falco`**, **`trivy-operator`** alongside **kubescape**, **kube-bench**, **polaris** — runtime / image-adjacent signals where you enable those plugins.

The **Add cluster** wizard surfaces **Kubescape, kube-bench, kube-hunter, Polaris** in Helm `global.kspm.*` flags; the **agents Helm chart** must implement those values if you use in-cluster agents.

### 2.2 CSPM / cloud-oriented plugins (Azure and multi-cloud)

For **Azure**, the **Azure connector** lists supported scanner plugins:

| Plugin | Notes |
|--------|--------|
| **prowler** | Multi-cloud assessment (often used for CSPM-style cloud reviews) |
| **scoutsuite** | Multi-cloud security assessment |
| **steampipe** | SQL-driven cloud queries / compliance (as configured) |
| **bloodhound** | Identity / attack paths (CIEM-adjacent; heavy permissions — scope carefully) |

Other connectors (context): **AWS** — prowler, scoutsuite, steampipe, pmapper, cloudfox; **GCP** — prowler, scoutsuite, steampipe, cartography.

**Not every plugin has a full container runner wired** in all deployments — the worker may **dry-run** if Docker/image is missing; **`POST /ingest/{tool}`** remains the **reliable** path to load normalized findings from an external run.

### 2.3 Other plugins (out of KSPM/CSPM core for this PoC)

The project may also include tools for **secrets** (gitleaks, trufflehog), **SAST/DAST** (sonarqube, zap, nuclei), **SCA** (snyk), **IaC** (checkov), **images** (trivy), **CWPP** (wazuh), etc. These are **not** the focus of **Phase 1 / 2** unless explicitly expanded.

---

## 3. How the full setup runs (control plane + scans + data)

### 3.1 Runtime stack (typical PoC)

1. **Deploy OpenCNAPP** — Docker Compose or **Helm** using the project’s **`helm/opencnapp`** chart (API, dashboard, **PostgreSQL**, **Redis**, **Celery worker**). See **Section 4**.
2. **Bootstrap** — API starts; plugins **sync** from `plugins/` into the **`plugins`** table (Plugin manager).
3. **Connectors** — **Cloud team** creates **Kubernetes** and (later) **Azure** connectors in the UI (credentials stored encrypted server-side).

### 3.2 How findings get in (three paths)

| Path | What runs | When to use |
|------|-----------|-------------|
| **A. Scan trigger** | **`POST /scans/trigger`** (Plugin manager) → **Celery** **`run_scan`** → worker runs **plugin Docker image** (if Docker socket + image + command exist) → output may need **follow-up ingest** depending on integration maturity. | Full automation when worker + images are ready. |
| **B. Direct ingest** | **`POST /ingest/{tool}`** with payload → **adapter** normalizes → **`findings`** table. | CI/CD, agents, or manual upload after running Kubescape/Prowler **outside** OpenCNAPP. |
| **C. Native / cloud APIs** | e.g. Azure **Defender** / Security Center paths when **env + credentials** are set (`native_ingest`, `ingest_native_findings`). | Optional correlation with **Defender** alerts. |

**Inventory / dashboards** read from **`findings`** (and connectors) — they do not populate until **A**, **B**, or **C** has written rows.

### 3.3 What actually runs in the test phase

- **Minimum viable KSPM PoC:** enable **kube-bench**, **kubescape**, and/or **polaris** in Plugin manager; run **ingest** or **scan** from an environment with **kubeconfig** to the **test AKS**; confirm **Findings** and **Inventory**.
- **CSPM PoC:** enable **prowler** (or **steampipe** / **scoutsuite**) with **RG-scoped** settings; avoid subscription-wide defaults in **test**.
- **In-cluster Helm agents:** only after **`oci://…`** points to a **real chart** (e.g. ACR); until then, **B** or **A** without agents is expected.

---

## 4. Deploying OpenCNAPP (control plane)

This section lists **what is required** to run the application stack. Commands assume you are in the **project root** (the directory that contains `docker-compose.yml`, `api/`, `dashboard/`, `scripts/`).

### 4.1 Host and software prerequisites

| Requirement | Detail |
|-------------|--------|
| **OS** | **Linux** (Ubuntu 22.04+, Debian 12+, RHEL-compatible 9+) recommended for PoC; macOS / Windows 11 with Docker Desktop acceptable for development. |
| **Software** | **Docker Engine 24+**, **Docker Compose v2+**, **Bash**; **Python 3.10+** for the setup script and local tooling. |
| **Sizing (minimum PoC)** | **4 vCPU**, **8 GB RAM**, **20 GB** disk. |
| **Sizing (recommended, small team)** | **8 vCPU**, **16 GB RAM**, **100 GB** SSD. |

### 4.2 Configuration file

- Copy **`.env.example`** to **`.env`** in the project root before first start.
- Change default **secrets**, **admin password**, and **public URLs** (`OPENCNAPP_API_PUBLIC_URL`, `OPENCNAPP_DASHBOARD_URL`, dashboard `VITE_API_URL`) to match your hostname/TLS in any non-local deployment.

### 4.3 Start with Docker Compose (default PoC path)

**Option A — helper script (recommended first run)**

```bash
./scripts/setup_opencnapp.sh
```

This creates `.env` if missing, builds images, and starts: **postgres**, **redis**, **api**, **worker**, **dashboard**.

**Option B — manual**

```bash
docker compose build
docker compose up -d postgres redis api worker dashboard
```

**After start (defaults)**

| Service | URL / note |
|---------|------------|
| **API** (OpenAPI) | `http://<host>:8000/docs` |
| **Dashboard** | `http://<host>:3000` |

Replace `<host>` with `localhost` on the same machine, or the VM/DNS name when remote.

### 4.4 Ports to open (firewall / NSG)

| Port | Service |
|------|---------|
| **3000** | Dashboard (dev server in default Compose) |
| **8000** | API |
| **5432** | PostgreSQL (expose only if you manage DB remotely; often internal) |
| **6379** | Redis (usually internal only) |
| **8080** | Optional **BloodHound** profile if enabled |

### 4.5 Optional Compose profiles

- **Runtime:** `docker compose --profile runtime up -d` — additional runtime-oriented services when defined in compose.
- **CIEM:** `docker compose --profile ciem up -d` — CIEM-oriented profile when defined.

Use only if your PoC explicitly needs those profiles.

### 4.6 Scanner workers and Docker

The default **api** and **worker** services mount **`/var/run/docker.sock`** so Plugin manager can run **containerized** scanner images. If Docker is unavailable or images are missing, rely on **`POST /ingest/{tool}`** from an external runner.

### 4.7 Alternative: deploy control plane on Kubernetes (Helm)

The project includes a **`helm/opencnapp`** chart to run **API, dashboard, worker** on a cluster. That is the **OpenCNAPP application** — **not** the same as the **in-cluster agents** chart described in **Section 4.9**.

### 4.8 KSPM — onboarding a cluster (Add cluster wizard)

OpenCNAPP **does not** run `helm` or `kubectl` for you. Admins run install commands on a machine where **`kubectl`** and **`helm`** target the **test cluster**.

**Wizard steps (3)**

| Step | You do | OpenCNAPP does |
|------|--------|----------------|
| **1. Type & name** | Choose **Kubernetes** (or **VM / bare metal**), set cluster/group name, display name, connector ID | Stores a **connector** with **settings** (cluster name, KSPM toggles). |
| **2. Options** | Toggle runtime vs misconfiguration scans, optional **join token**, select **KSPM tools** | Saves preferences; **join token** is how in-cluster agents authenticate to your tenant (when used). |
| **3. Install command** | Copy **Helm** (or VM) snippet and run in your environment | Only **generates** the command; after agents or scans run, Plugin manager / ingest populate findings. |

**Join token** — Create under **Settings → Agent join tokens** in the dashboard. Shown **once** at creation; store securely. Helm uses **`global.agents.joinToken`**.

**Tenant ID (`global.tenantId`)** — Stable workspace id for agents. The UI fills it from the API (same as **`tenant_id`** from **`GET /auth/me`** / **`GET /auth/config`**). On first API start a **default workspace UUID** is created. Optional override: set **`OPENCNAPP_TENANT_ID`** on the API server and use the **same** value in Helm.

**Helm example (template — values must match your chart)**

```text
helm upgrade --install opencnapp-agents oci://YOUR_REGISTRY/agents \
  -n opencnapp-agents --create-namespace \
  --set global.clusterName="<your cluster name>" \
  --set global.tenantId="<tenant uuid>" \
  --set global.agents.joinToken="<token>" \
  --set global.runtime.enabled=true|false \
  --set global.riskassessment.enabled=true|false \
  --set global.kspm.kubescape.enabled=true|false \
  --set global.kspm.kubeBench.enabled=true|false \
  --set global.kspm.kubeHunter.enabled=true|false \
  --set global.kspm.polaris.enabled=true|false
```

- **`oci://YOUR_REGISTRY/agents`** is a **placeholder**. Replace with your real **OCI Helm chart** location (e.g. private registry). The project’s **`helm/opencnapp`** chart deploys the **control plane**, not necessarily a separate public **`agents`** chart — until your team publishes an **agents** chart, treat this as a **template** showing expected **values**.
- Run the command in a **terminal** (laptop, jump box, or CI) with kubeconfig for the cluster — **not** inside the OpenCNAPP API container.

**Azure Kubernetes Service (AKS)**

```bash
az login
az aks get-credentials --resource-group <YOUR_RG> --name <YOUR_CLUSTER_NAME>
```

Then `kubectl get nodes` and Helm use that context. If you host a chart in **Azure Container Registry**, URLs often look like **`oci://<acrName>.azurecr.io/<path-to-chart>:<version>`** — use **`az acr login`** and Helm OCI login per Microsoft’s ACR Helm guidance.

**If you have no agents chart yet**

1. **Plugin manager** — enable Kubescape / kube-bench / Polaris / etc.; run scans from a host whose **kubeconfig** points at the test AKS (worker with Docker, or CI), then ingest if needed.  
2. **`POST /ingest/{tool}`** — push normalized results from scanners you run yourself.

**VM / bare-metal snippet** — If the wizard offers a **`curl … | bash`** style install, it expects flags such as **`--opencnapp-api`** (base API URL), **`--tenant-id`**, **`--connector-id`**, **`--cluster-name`**, **`--token`**. Treat script URLs as **placeholders** until your build publishes a real installer.

### 4.9 Two different Helm charts (do not confuse)

| Chart / URL | Purpose |
|-------------|---------|
| **`helm/opencnapp` (in project)** | Deploys **OpenCNAPP** (API, dashboard, worker, DB dependencies as you wire them). |
| **`oci://…/agents` (your registry)** | **In-cluster agents** for telemetry/scanners — **optional** for PoC if you use plugin scans + ingest only. |

---

## 5. Phase 1 — KSPM (Kubernetes) — detail

### 5.1 What is KSPM?

**KSPM** means security posture for **Kubernetes**: misconfigurations, CIS-style checks, workload risk signals, image/CVE signals where tools provide them, and **inventory** (clusters, namespaces, workloads) derived from findings and connectors.

**What we are trying to validate**

- **Inventory** views (clusters, namespaces, workloads, images) for onboarded clusters.
- **Cluster detail** (misconfigurations, policies, severity, etc.) driven by **ingested findings**.
- **KSPM domain dashboard** and **findings** filtered to the **kspm** domain.
- Optional **in-cluster agents** (Helm) **if/when** a **published agents Helm chart** exists; otherwise **scanner-based** paths (Plugin manager + kubeconfig, or manual ingest).

### 5.2 How it works (high level)

```text
[AKS cluster]  →  (optional) agents / scanners  →  OpenCNAPP API  →  PostgreSQL  →  Dashboard
                         ↑
              kubectl / Helm from admin laptop or CI
```

1. **Connector** — A **Kubernetes** (or on-prem) connector is created in OpenCNAPP (name, settings, optional **join token**).
2. **Access to cluster** — An admin runs **`az aks get-credentials`** (for AKS) so `kubectl` / `helm` target the **test** cluster only.
3. **Data path** — Findings reach OpenCNAPP via **Section 3.2** (scan, ingest, or native).
4. **UI** — Inventory, KSPM dashboard, and findings update from the **database**.

### 5.3 What we need from the cloud team (KSPM)

| Ask | Why |
|-----|-----|
| **One (or few) non-production AKS clusters** dedicated to **testing** | Isolated blast radius; no production change window tied to PoC. |
| **RBAC**: least-privilege for testers (`Azure Kubernetes Service Cluster User Role` or equivalent) to run **`kubectl`** / **Helm** on **those** clusters only. |
| **Network** — OpenCNAPP **API** must be **reachable** from where agents/scanners run (same VNet, VPN, or controlled egress). Document **URL**, TLS, firewall rules. |
| **Service principal / identity** (if scans run from a **CI** or **VM** in Azure) with permission to use **kubeconfig** or AKS API for **test** clusters only. |
| **Optional**: **Azure Container Registry (ACR)** if we **publish** an internal **agents Helm chart** — otherwise we rely on **scanner + ingest** without in-cluster agents. |

### 5.4 After onboarding — agents Helm vs scans without agents

| Path | When |
|------|------|
| **Helm (agents)** | Only when **`oci://…`** points to **your** published chart (e.g. ACR). Run **`helm upgrade --install`** with `global.tenantId`, `global.agents.joinToken`, `global.kspm.*` from the wizard. |
| **VM / script** | Alternative snippet in wizard for non-K8s hosts — **you** run the command in a shell with access to the target. |
| **No agents chart yet** | Use **Plugin manager** + **kubeconfig** to cluster, or **manual `POST /ingest`**, to prove KSPM findings without in-cluster Helm. |

### 5.5 Impact on Azure resources and charges

| Topic | Practical impact |
|-------|------------------|
| **AKS nodes** | Running **scanner pods** or **agents** uses **CPU/RAM** on **your** node pools → normal **AKS VM / capacity** billing. |
| **Egress** | Findings payloads to OpenCNAPP API are usually **small** (JSON). **Cost** rises with **volume**, **cross-region** egress, or **large** logs — design PoC **same region** where possible. |
| **Storage** | OpenCNAPP **PostgreSQL** stores findings — disk size for DB backups as per your VM/DB sizing. |
| **Adverse effect on “whole subscription”** | **KSPM testing scoped to designated AKS** does **not** require subscription-wide changes. **No** broad subscription policy changes are implied by KSPM alone. |

**Mitigations:** Use **non-prod** subscription or **resource group**-isolated test clusters; **limit** scanner concurrency; **monitor** egress in Azure Cost Management.

### 5.6 Could our tools negatively affect production?

- **OpenCNAPP** does not execute **Helm** or **kubectl** by itself — **your** admins run commands against **agreed** clusters.
- **Active** scanners (e.g. kube-hunter-style) can be **noisy** — keep them **off production** or require explicit approval (the product can require `confirm_active_scan` for some plugins).
- **Read-only posture scans** (many misconfig tools) are lower risk than **active** probes; still follow **change** and **security** process.

---

## 6. Phase 2 — CSPM (Azure / cloud)

### 6.1 Cloud team requirement: resource group scope (not whole subscription)

**Ask:** Perform **CSPM-related testing** in a **dedicated resource group** (or subscription) with **multiple resources**, **not** open-ended activity across the **entire** production subscription.

**How we align**

- **Azure RBAC**: grant the OpenCNAPP connector’s **service principal** (or managed identity) permissions **only** on that **resource group** (e.g. Reader + scoped custom role for assessments), **not** Owner on the full subscription.
- **Connector settings**: store **subscription ID** + **resource group name(s)** in connector **settings** so scanners **target** that scope (implementation detail as features land; principle is **least privilege**).
- **Prowler / Steampipe / Scoutsuite**-style tools should be configured with **explicit** scope in **plugin config** — avoid “scan entire subscription” defaults in **test**.

### 6.2 Microsoft Defender for Cloud — what OpenCNAPP adds

| Layer | Role |
|-------|------|
| **Defender for Cloud** | Native Azure security alerts, recommendations, secure score — **authoritative** in Azure. |
| **OpenCNAPP** | **Aggregation**, **custom plugins**, **connectors**, **unified findings** with **KSPM** and other domains in **one** UI/API — **not** a duplicate control plane. |

**Do we need to pull data from Defender into OpenCNAPP?**

- **Optional.** The codebase includes paths for **native-style** Azure ingestion (e.g. **Security Center** alerts) **when** environment and credentials are configured — useful to **correlate** Defender with other findings.
- **Not mandatory** for PoC: CSPM can start with **connector + scanner plugins** on a **scoped RG**; Defender pull can be **phase 2b** once RBAC and networking are approved.

### 6.3 CSPM impact and egress

Same principles as KSPM: **egress** from scanners/runners to OpenCNAPP API; **API calls** to Azure ARM (metadata, assessments) — **billable** per **Azure pricing** for API throughput and **egress** if cross-region. **Scope** to **test RG** to limit blast radius and noise.

---

## 7. Pentest runner and CNAPP — subscription-wide risk?

- **Pentest runner** features should be treated as **potentially invasive**. They must **not** run against **production** or **whole subscription** without **explicit** scope and approval.
- **Testing**: use **dedicated** lab RG/subscription, **fixed** target lists, and **rate limits**.
- **Adverse effect on “entire Azure subscription”**: **avoid** by policy — **no** default “scan entire tenant.” Scope **targets** in configuration.

---

## 8. Summary table — asks by team

| Team | KSPM asks | CSPM asks |
|------|---------|-----------|
| **Cloud team / platform** | Test AKS + `get-credentials`; firewall path to OpenCNAPP API; optional ACR for internal Helm chart. | SP / MI with **RG-scoped** RBAC; optional Defender read for ingest PoC. |
| **Security / IAM** | Approve scanner types (active vs passive) for test clusters. | Approve cloud connector permissions and Defender API read (if used). |
| **Management** | Approve **non-prod** boundary and **timeline** for Phase 1 then Phase 2. | Approve **scope** (RG vs subscription) and **cost** monitoring. |

---

## 9. Suggested timeline

| Week | Milestone |
|------|-----------|
| **1–2** | Deploy OpenCNAPP PoC (**Section 4**); create **K8s connector**; validate **inventory** + **findings** path (ingest or plugin). |
| **3–4** | Optional in-cluster Helm **if** chart published; **Sync K8s tables**; demo **KSPM dashboard** + **Inventory** to stakeholders. |
| **5+** | **CSPM**: scoped **RG** connector; plugin test; optional **Defender** correlation. |

---

## 10. Further documentation (inside the project bundle)

When you have the **full OpenCNAPP source or release**, these files add detail beyond this plan:

| Topic | Typical path in project |
|-------|-------------------------|
| Sizing, ports, profiles | `docs/feasibility-and-requirements.md` |
| Add cluster / AKS / OCI / inventory APIs | `docs/help/kspm-cluster-onboarding.md` |
| Inventory UI scope | `docs/inventory-kspm-built.md`, `docs/plans/kspm-inventory-plan.md` |
| KSPM dashboard widgets | `docs/kspm-domain-dashboard-scope.md` |
| Plugin definitions | `plugins/*/plugin.yaml` |

---

**Document owner:** Testing / platform lead  
**Revision:** 1.2 — standalone deployment (Compose, Helm, KSPM onboarding), no external doc dependency.
