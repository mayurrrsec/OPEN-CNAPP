# KSPM: Add cluster / workload onboarding

This guide explains the **Add cluster** wizard in OpenCNAPP, how it ties to **Kubernetes Security Posture Management (KSPM)**, and how it relates to in-repo scanner plugins (`kube-bench`, `kube-hunter`, `Polaris`, **Kubescape**).

---

## End-to-end flow (3 steps)

| Step | What you do | What OpenCNAPP does |
|------|----------------|----------------------|
| **1. Type & name** | Choose **Kubernetes** or **VM / bare metal**, set cluster/group name, display name, connector ID | Stores a **connector** record (`kubernetes` or `onprem`) with your **settings** (cluster name, KSPM toggles, etc.). Credentials are optional until you add a token. |
| **2. Options** | Toggle runtime vs misconfiguration scans, optional **join token**, select **KSPM tools** | Saves preferences on the connector. The **join token** is how in-cluster agents authenticate back to your OpenCNAPP tenant (when you use the generated install command). |
| **3. Install command** | Copy the **Helm** (or VM) snippet and run it in your environment | OpenCNAPP **does not** run Helm for you. After agents run and findings are ingested, **Plugin Manager** jobs (e.g. Kubescape, kube-bench) can target this cluster’s connector context. |

---

## Connector ID vs display name

- **Display name** — Human-readable label in the UI (e.g. `Production EKS`).
- **Connector ID** — Stable slug used in APIs and storage (lowercase, hyphens).  
  The wizard **generates** the connector ID from the display name **when you leave the display name field (blur)** if you have not edited the connector ID yourself. This avoids the old bug where only the first character was synced while typing.

---

## What is the “Join token”?

The **join token** is a **shared secret** that the in-cluster agent uses so OpenCNAPP knows which tenant/cluster the heartbeat and telemetry belong to.

- Create one under **Settings → Agent join tokens** in the dashboard. The full value is shown **once** at creation; copy it or use **Copy & open Add cluster wizard** to pre-fill step 2.
- Stored tokens are listed by name and a short prefix only — you cannot retrieve the full secret again (create a new token if lost).
- For a working install, agents need a valid token in Helm (`global.agents.joinToken`). If you leave the field blank, the generated command shows `YOUR_JOIN_TOKEN` — replace it before running Helm.

## What is `global.tenantId`?

The **tenant ID** is a **stable workspace identifier** for agents (Helm `global.tenantId`). The dashboard fills it from the API — same value as **GET /auth/config** and **GET /auth/me** (`tenant_id`).

- **Single-workspace installs:** On first API startup, OpenCNAPP creates a **default workspace** row with a **UUID** (e.g. `a1b2c3d4-e5f6-7890-abcd-ef1234567890`). That UUID is your tenant id until you add multi-workspace features.
- **Override:** Set **`OPENCNAPP_TENANT_ID`** on the API server if you need a fixed string (then restart the API). Use the **same** value in Helm so agents match the control plane.
- **Future:** Additional workspaces can each get their own id; routing users/agents by workspace will build on this table.

Placeholder **`YOUR_TENANT`** in generic docs means “paste the `tenant_id` from the UI/API”; the live wizard shows the real UUID.

---

## What does the Helm command do?

### Beginner: what is `oci://YOUR_REGISTRY/agents`?

- **`oci://`** means “install this Helm chart from an **OCI registry**” (same idea as Docker images, but for charts).
- **`YOUR_REGISTRY/agents`** is a **placeholder**. You replace it with the real location of the **in-cluster agents** chart your team publishes, for example:
  - `oci://ghcr.io/your-org/charts/opencnapp-agents` (example shape — not a live URL),
  - or a private Harbor / ECR / Artifactory path your company uses.

**This repository** ships **`helm/opencnapp`** — that chart deploys the **OpenCNAPP control plane** (API, dashboard, worker, etc.) on a cluster. It does **not** automatically publish a separate public **`opencnapp-agents`** chart at a fixed `oci://…` URL. Until your deployment provides that chart (or you vendor/build one), the wizard command is a **template** showing which **values** (`tenantId`, `joinToken`, `global.kspm.*`) the agents are expected to accept.

**If you don’t have an agents chart yet**, you can still use KSPM-style findings by:

1. **Plugin manager** — enable Kubescape / kube-bench / etc. and run scans from an environment that has **kubeconfig** access (Celery worker with Docker, or external CI), with results ingested into OpenCNAPP; or  
2. **`POST /ingest/{tool}`** — push normalized findings from any scanner you run yourself.

### Where do you run the Helm command?

You run it in a **terminal on your laptop or in CI** — wherever **`kubectl` and `helm`** are installed and configured to talk to **your Kubernetes cluster** (same kubeconfig you use for `kubectl get nodes`). You do **not** paste the command into the OpenCNAPP web UI; the UI only **generates** the command for you to copy.

The command **installs workloads into that cluster** (namespace `opencnapp-agents` in the example). It does not run “inside” the OpenCNAPP server container.

---

The snippet is a **template** (your registry URL and chart version will come from your deployment docs):

```text
helm upgrade --install opencnapp-agents oci://YOUR_REGISTRY/agents \
  -n opencnapp-agents --create-namespace \
  --set global.clusterName="<your cluster name>" \
  --set global.tenantId="YOUR_TENANT" \
  --set global.agents.joinToken="<token>" \
  --set global.runtime.enabled=true|false \
  --set global.riskassessment.enabled=true|false \
  --set global.kspm.kubescape.enabled=true|false \
  --set global.kspm.kubeBench.enabled=true|false \
  --set global.kspm.kubeHunter.enabled=true|false \
  --set global.kspm.polaris.enabled=true|false
```

Rough meaning:

| Flag / value | Meaning |
|--------------|--------|
| `global.clusterName` | Logical name for this cluster in OpenCNAPP (matches **Cluster / group name** in the wizard). |
| `global.tenantId` | Workspace tenant id (UUID from `workspaces` table, or `OPENCNAPP_TENANT_ID` override). |
| `global.agents.joinToken` | Same idea as the **Join token** in the wizard. |
| `global.runtime.enabled` | **Runtime visibility & protection** (e.g. runtime events / agents). |
| `global.riskassessment.enabled` | **Cluster / host misconfiguration** style assessments (aligned with posture scans). |
| `global.kspm.*.enabled` | Mirrors the **KSPM scanners** checkboxes (Kubescape, kube-bench, kube-hunter, Polaris). Your agent chart must implement these values; if not, preferences still live on the **connector** `settings.kspm` for Plugin manager workflows. |

The wizard stores **KSPM tool** choices on the connector and echoes them in the generated command as **chart values** when your Helm chart supports them (names may vary by release).

### VM / bare-metal install snippet

If you pick **VM / bare metal**, step 3 shows a `curl … | bash` example. Typical flags (names may match your agent package):

| Flag | Role |
|------|------|
| `--opencnapp-api` | Base URL of the OpenCNAPP API (dashboard `VITE_API_URL`, e.g. `http://localhost:8000`). |
| `--tenant-id` | Same workspace id as Helm `global.tenantId` (UUID). |
| `--connector-id` | Connector id from the wizard (API `name` / slug). |
| `--cluster-name` | **Cluster / group name** from step 1. |
| `--token` | Join token from step 2 (same secret as Helm `global.agents.joinToken`). |

The path `/install/vm-agent.sh` is a **placeholder** until your build publishes a real script; point `curl` at the URL from your deployment docs if different.

---

## KSPM tools: Kubescape, kube-bench, kube-hunter, Polaris

These are **separate scanner plugins** in the `plugins/` directory. They run as **scheduled or on-demand jobs** against your environment and ingest findings into OpenCNAPP — they are **not** all embedded inside a single Helm flag in every version of the chart.

| Tool | Role | Plugin in repo |
|------|------|------------------|
| **Kubescape** | Broad Kubernetes posture / compliance scanning | `plugins/kubescape/plugin.yaml` |
| **kube-bench** | CIS Kubernetes Benchmark checks | `plugins/kube-bench/plugin.yaml` |
| **kube-hunter** | Active penetration-style checks (use with care in prod) | `plugins/kube-hunter/plugin.yaml` |
| **Polaris** | Best-practice / policy checks | `plugins/polaris/plugin.yaml` |

**Why Kubescape might have seemed “missing”** — It was always listed on the **Kubernetes connector** in code (`supported_plugins`) and ships as a **plugin**, but the **Add cluster** UI did not surface it explicitly until the wizard listed KSPM tools. Enable plugins under **Plugin manager** and ensure scans are scheduled for the **kubernetes** domain.

---

## Suggested workflow to “configure clusters” for KSPM

1. **Add cluster** wizard — Create the connector, select KSPM tools, copy the install command, run Helm in the cluster.
2. **Plugin manager** — Enable **kubescape**, **kube-bench**, **kube-hunter**, **polaris** as needed; sync plugins from `plugins/`.
3. **Scans** — Run or schedule scans so findings appear (connector / kubeconfig context must match how your runner executes jobs).
4. **Findings / KSPM dashboard** — Filter by domain `kspm` (or tool name) as data flows in.

---

## Testing with Azure Kubernetes Service (AKS)

If your clusters live in **Azure** (e.g. **Kubernetes center** in the portal, multiple AKS clusters in resource groups like `RG-SANDBOX-CI`, `isb-rg`, etc.):

1. **Pick one cluster** for testing and install the **Azure CLI** (`az`) if you don’t have it.
2. **Sign in and get kubeconfig** (run on your laptop or in Cloud Shell):

   ```bash
   az login
   az aks get-credentials --resource-group <YOUR_RG> --name <YOUR_CLUSTER_NAME>
   ```

   After this, `kubectl get nodes` should talk to **that** AKS cluster.

3. **Helm** uses the **same** kubeconfig context. The **Add cluster** wizard command is still `helm upgrade --install ...` — you run it **against that cluster** once you replace `oci://YOUR_REGISTRY/agents` with a chart you actually have (or use the plugin/ingest path below).

4. **OCI registry on Azure** — If you publish your own agents Helm chart to **Azure Container Registry (ACR)**, the URL usually looks like:

   `oci://<acrName>.azurecr.io/<path-to-chart>:<version>`

   You must **`az acr login -n <acrName>`** (or use a token) and configure Helm for OCI (`helm registry login ...`) per [Microsoft’s Helm OCI docs](https://learn.microsoft.com/azure/container-registry/container-registry-helm-charts). This repo does **not** ship a fixed ACR URL; your team creates the registry and pushes the chart.

5. **If you don’t have an agents chart in ACR yet** — Use AKS only as the **scan target**: run **Plugin manager** scans from a machine/worker whose kubeconfig points at that AKS (after `get-credentials`), or run scanners in CI and **`POST /ingest/{tool}`**. Findings will still show under **Findings** and **Inventory** when tagged to your connector.

---

## Inventory: cluster row & detail panel

After a **kubernetes** / **onprem** connector exists, **Inventory → Clusters** lists it with connection status (derived from recent findings), finding counts by bucket (CIS / KSPM / IMG / SEC), and opens a **right-hand detail panel** on row click.

| Area | Behavior |
|------|-----------|
| **Panel** | Full-height slide-over (`Dialog` variant `right`, wide). List stays visible behind dimmed overlay. |
| **Status badge** | **Connected** / **Pending** / **Disconnected** from `GET /inventory/clusters/{id}/status` (polls ~30s while open). |
| **Tabs** | Overview, Misconfiguration, Cloud Assets (cluster-scoped), Vulnerabilities, Alerts, Compliance, Policies, App behaviour, KIEM — each backed by a dedicated API under `/inventory/clusters/{id}/…`. |
| **Data** | Findings are matched to the connector via `account_id` / `resource_id` / `resource_name` (see `api/inventory/helpers.py`). Ingest from Kubescape, Trivy, Falco, etc., tags findings to this cluster for inventory views. |

### API quick reference (authenticated)

- `GET /inventory/clusters` — table rows for K8s connectors.
- `GET /inventory/clusters/{cluster_id}/overview` — K8s resource summary, trend, cluster_info.
- `GET /inventory/clusters/{cluster_id}/status` — `{ "connection_status": "connected" \| "pending" \| "disconnected" }`.
- `GET /inventory/clusters/{cluster_id}/misconfigurations` — KSPM/CIS-style findings + insights (pagination, `severity`, `search`).
- `GET /inventory/clusters/{cluster_id}/vulnerabilities` — CVE / image-scanner style rows.
- `GET /inventory/clusters/{cluster_id}/alerts` — high-severity / runtime-alert style rows.
- `GET /inventory/clusters/{cluster_id}/compliance` — framework-domain findings.
- `GET /inventory/clusters/{cluster_id}/policies` — controls grouped by `check_id` (Kubescape-style).
- `GET /inventory/clusters/{cluster_id}/app-behaviour` — Falco/runtime-oriented rows.
- `GET /inventory/clusters/{cluster_id}/kiem` — identity / RBAC–oriented rows.
- `GET /inventory/clusters/{cluster_id}/cloud-assets` — cloud-linked asset groups + severity rollups.
- `GET /inventory/assets` — global CSPM asset aggregation from findings (optional `group_by=category`).

Full UI specification and checklist: **`docs/plans/kspm-inventory-plan.md`**.

---

## Related files

- Wizard UI: `dashboard/src/components/connectors/AddClusterWizard.tsx`
- Kubernetes connector: `api/connectors/kubernetes.py`
- Cluster detail routes: `api/routes/cluster_detail.py`
- Inventory routes: `api/routes/inventory_api.py`
- Inventory UI: `dashboard/src/pages/Inventory.tsx`, `dashboard/src/pages/inventory/`
- Plugins: `plugins/kubescape/`, `plugins/kube-bench/`, `plugins/kube-hunter/`, `plugins/polaris/`
