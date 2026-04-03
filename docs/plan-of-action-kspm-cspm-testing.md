# Plan of action — OpenCNAPP testing phase (KSPM → CSPM)

**Audience:** Management, cloud / platform team, security engineering  
**Purpose:** Align on **what** we are testing, **why** it helps, **what** the company must provide, **risk** to Azure subscriptions and billing, and **order of work** (KSPM first, then CSPM).

**Note:** OpenCNAPP is **open source** and **self-hosted**. There is **no vendor SaaS fee**; any **cost** is **your cloud and infrastructure** (compute, egress, optional Defender APIs, etc.).

---

## 1. Executive overview

### 1.1 What is this project?

**OpenCNAPP** is an open, **local-first CNAPP** (Cloud-Native Application Protection Platform) that brings together **posture, vulnerabilities, findings, connectors, and plugins** in one system. It is intended to unify visibility across **Kubernetes (KSPM)**, **cloud (CSPM)**, and other domains, with a **dashboard** and **APIs** under your control.

### 1.2 What we are implementing (testing scope)

| Phase | Focus | Goal of the test |
|-------|--------|-------------------|
| **Phase 1 (now)** | **KSPM** — Kubernetes Security Posture Management | Prove **cluster inventory**, **misconfiguration / scanner findings**, and **KSPM-oriented dashboards** against **company-managed AKS** (or equivalent) with acceptable risk and cost. |
| **Phase 2 (next)** | **CSPM** — Cloud Security Posture Management | Prove **cloud connector** workflows, **scoped** assessment (see **resource group** requirement below), and optional integration with **Microsoft Defender for Cloud** data. |

### 1.3 How this helps the company

- **Single pane** for security findings from **Kubernetes** and (later) **Azure**, tied to **your** connectors and policies — not locked to one vendor UI.
- **Repeatable testing** of **KSPM then CSPM** in a controlled way, with **documented** permissions and blast radius.
- **Open architecture**: you can add **plugins** (e.g. Kubescape, kube-bench, cloud scanners) and **ingest** paths without replacing Defender or AKS — **complementary**, not mandatory replacement.

---

## 2. Phase 1 — KSPM (Kubernetes)

### 2.1 What is KSPM?

**KSPM** means security posture for **Kubernetes**: misconfigurations, CIS-style checks, workload risk signals, image/CVE signals where tools provide them, and **inventory** (clusters, namespaces, workloads) derived from findings and connectors.

**What we are trying to validate**

- **Inventory** views (clusters, namespaces, workloads, images) for onboarded clusters.
- **Cluster detail** (misconfigurations, policies, severity, etc.) driven by **ingested findings**.
- **KSPM domain dashboard** and **findings** filtered to the **kspm** domain.
- Optional **in-cluster agents** (Helm) **if/when** a **published agents Helm chart** exists; otherwise **scanner-based** paths (Plugin manager + kubeconfig, or manual ingest).

### 2.2 How it works (high level)

```text
[AKS cluster]  →  (optional) agents / scanners  →  OpenCNAPP API  →  PostgreSQL  →  Dashboard
                         ↑
              kubectl / Helm from admin laptop or CI
```

1. **Connector** — A **Kubernetes** (or on-prem) connector is created in OpenCNAPP (name, settings, optional **join token**).
2. **Access to cluster** — An admin runs **`az aks get-credentials`** (for AKS) so `kubectl` / `helm` target the **test** cluster only.
3. **Data path** — Findings reach OpenCNAPP via:
   - **`POST /ingest/{tool}`** (normalized payloads), and/or  
   - **Plugin / scan jobs** (where Docker + Celery workers are configured), and/or  
   - **Future** in-cluster agents (Helm) **when a real chart URL** is available — not a magic default URL in the repo.
4. **UI** — Inventory, KSPM dashboard, and findings update from the **database**.

### 2.3 What we need from the company (KSPM)

| Ask | Why |
|-----|-----|
| **One (or few) non-production AKS clusters** dedicated to **testing** | Isolated blast radius; no production change window tied to PoC. |
| **RBAC**: least-privilege for testers (`Azure Kubernetes Service Cluster User Role` or equivalent) to run **`kubectl`** / **Helm** on **those** clusters only. |
| **Network** — OpenCNAPP **API** must be **reachable** from where agents/scanners run (same VNet, VPN, or controlled egress). Document **URL**, TLS, firewall rules. |
| **Service principal / identity** (if scans run from a **CI** or **VM** in Azure) with permission to use **kubeconfig** or AKS API for **test** clusters only. |
| **Optional**: **Azure Container Registry (ACR)** if we **publish** an internal **agents Helm chart** — otherwise we rely on **scanner + ingest** without in-cluster agents. |

### 2.4 Deployment of OpenCNAPP (control plane)

Typical PoC (from repo docs):

- **Docker Compose** on a **Linux VM** or **single node** (see `docs/feasibility-and-requirements.md`): ~**4 vCPU / 8 GB RAM** minimum; **8 vCPU / 16 GB** recommended for team use.
- **Ports**: API **8000**, dashboard **3000**, Postgres **5432**, Redis **6379** (internal if not exposed).

**Helm**: The repo includes **`helm/opencnapp`** for deploying the **OpenCNAPP application stack** (API, dashboard, worker). That is **separate** from the **“agents”** Helm snippet in the **Add cluster** wizard, which points to **`oci://YOUR_REGISTRY/agents`** — a **placeholder** until your org publishes an agents chart.

### 2.5 After onboarding — Helm vs VM

| Path | When |
|------|------|
| **Helm (agents)** | Only when **`oci://…`** points to **your** published chart (e.g. ACR). Run **`helm upgrade --install`** with `global.tenantId`, `global.agents.joinToken`, `global.kspm.*` from the wizard. |
| **VM / script** | Alternative snippet in wizard for non-K8s hosts; same idea — **you** run the command in a shell with access to the target. |
| **No agents chart yet** | Use **Plugin manager** + **kubeconfig** to cluster, or **manual `POST /ingest`**, to prove KSPM findings without in-cluster Helm. |

### 2.6 Impact on Azure resources and charges

| Topic | Practical impact |
|-------|------------------|
| **AKS nodes** | Running **scanner pods** or **agents** uses **CPU/RAM** on **your** node pools → normal **AKS VM / capacity** billing. |
| **Egress** | Findings payloads to OpenCNAPP API are usually **small** (JSON). **Cost** rises with **volume**, **cross-region** egress, or **large** logs — design PoC **same region** where possible. |
| **Storage** | OpenCNAPP **PostgreSQL** stores findings — disk size for DB backups as per your VM/DB sizing. |
| **Adverse effect on “whole subscription”** | **KSPM testing scoped to designated AKS** does **not** require subscription-wide changes. **No** broad subscription policy changes are implied by KSPM alone. |

**Mitigations:** Use **non-prod** subscription or **resource group**-isolated test clusters; **limit** scanner concurrency; **monitor** egress in Azure Cost Management.

### 2.7 Could our tools negatively affect production?

- **OpenCNAPP** does not execute **Helm** or **kubectl** by itself — **your** admins run commands against **agreed** clusters.
- **Active** scanners (e.g. kube-hunter-style) can be **noisy** — keep them **off production** or require explicit approval (the product can require `confirm_active_scan` for some plugins).
- **Read-only posture scans** (many misconfig tools) are lower risk than **active** probes; still follow **change** and **security** process.

---

## 3. Phase 2 — CSPM (Azure / cloud)

### 3.1 Company requirement: resource group scope (not whole subscription)

**Ask:** Perform **CSPM-related testing** in a **dedicated resource group** (or subscription) with **multiple resources**, **not** open-ended activity across the **entire** production subscription.

**How we align**

- **Azure RBAC**: grant the OpenCNAPP connector’s **service principal** (or managed identity) permissions **only** on that **resource group** (e.g. Reader + scoped custom role for assessments), **not** Owner on the full subscription.
- **Connector settings**: store **subscription ID** + **resource group name(s)** in connector **settings** so scanners **target** that scope (implementation detail as features land; principle is **least privilege**).
- **Prowler / Steampipe / Scoutsuite**-style tools should be configured with **explicit** scope in **plugin config** — avoid “scan entire subscription” defaults in **test**.

### 3.2 Microsoft Defender for Cloud — what OpenCNAPP adds

| Layer | Role |
|-------|------|
| **Defender for Cloud** | Native Azure security alerts, recommendations, secure score — **authoritative** in Azure. |
| **OpenCNAPP** | **Aggregation**, **custom plugins**, **connectors**, **unified findings** with **KSPM** and other domains in **one** UI/API — **not** a duplicate control plane. |

**Do we need to pull data from Defender into OpenCNAPP?**

- **Optional.** The codebase includes paths for **native-style** Azure ingestion (e.g. **Security Center** alerts) **when** environment and credentials are configured — useful to **correlate** Defender with other findings.
- **Not mandatory** for PoC: CSPM can start with **connector + scanner plugins** on a **scoped RG**; Defender pull can be **phase 2b** once RBAC and networking are approved.

### 3.3 CSPM impact and egress

Same principles as KSPM: **egress** from scanners/runners to OpenCNAPP API; **API calls** to Azure ARM (metadata, assessments) — **billable** per **Azure pricing** for API throughput and **egress** if cross-region. **Scope** to **test RG** to limit blast radius and noise.

---

## 4. Pentest runner and CNAPP — subscription-wide risk?

- **Pentest runner** features should be treated as **potentially invasive**. They must **not** run against **production** or **whole subscription** without **explicit** scope and approval.
- **Testing**: use **dedicated** lab RG/subscription, **fixed** target lists, and **rate limits**.
- **Adverse effect on “entire Azure subscription”**: **avoid** by policy — **no** default “scan entire tenant.” Scope **targets** in configuration.

---

## 5. Summary table — asks by team

| Team | KSPM asks | CSPM asks |
|------|---------|-----------|
| **Cloud / platform** | Test AKS + `get-credentials`; firewall path to OpenCNAPP API; optional ACR for internal Helm chart. | SP / MI with **RG-scoped** RBAC; optional Defender read for ingest PoC. |
| **Security / IAM** | Approve scanner types (active vs passive) for test clusters. | Approve cloud connector permissions and Defender API read (if used). |
| **Management** | Approve **non-prod** boundary and **timeline** for Phase 1 then Phase 2. | Approve **scope** (RG vs subscription) and **cost** monitoring. |

---

## 6. Suggested timeline

| Week | Milestone |
|------|-----------|
| **1–2** | Deploy OpenCNAPP PoC (VM/Compose or Helm); create **K8s connector**; validate **inventory** + **findings** path (ingest or plugin). |
| **3–4** | Optional in-cluster Helm **if** chart published; **Sync K8s tables**; demo **KSPM dashboard** + **Inventory** to stakeholders. |
| **5+** | **CSPM**: scoped **RG** connector; plugin test; optional **Defender** correlation. |

---

## 7. References (in repo)

- `docs/help/kspm-cluster-onboarding.md` — Add cluster wizard, Helm template, AKS notes, `YOUR_REGISTRY` explanation.
- `docs/inventory-kspm-built.md` — What the **inventory / KSPM UI** implements.
- `docs/kspm-domain-dashboard-scope.md` — KSPM dashboard widgets vs AccuKnox reference.
- `docs/feasibility-and-requirements.md` — Sizing and ports.

---

**Document owner:** Testing / platform lead  
**Revision:** 1.0 — align with company cloud policy before execution.
