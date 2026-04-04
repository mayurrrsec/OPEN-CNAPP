# Implementation status (living document)

This file records **what is implemented in the repo today** (not roadmap intent). Update it when you merge meaningful features. For roadmap vs gaps, see `docs/roadmap-gap-analysis.md`.

**Last updated:** 2026-04-04 (IAM graph tables + panel — see §CSPM & attack paths)

---

## How we work from here (process)

To avoid half-finished surface area across CSPM, KSPM, CWPP, etc., prefer **one domain or one vertical slice per iteration**:

1. **Pick a scope** — e.g. CSPM (cloud posture), KSPM (Kubernetes), registry scanning, alerts, compliance, connectors only, etc.
2. **Define done** — API contract + UI + empty/error states + docs note in this file.
3. **Ship it** — merge, then move to the next domain.

Larger cross-cutting work (global search, SSO hardening) should still be scheduled explicitly so dashboard pages do not all drift in parallel.

---

## CSPM & attack paths (2026-04)

**ExecPlan:** `docs/execplans/cspm-attack-paths.md` · **IAM graph ExecPlan:** `docs/execplans/cloud-iam-rbac-graph.md` · **Diagram:** `docs/execplans/cspm_attack_path_architecture.svg` · **Help:** `docs/help/attack-paths.md`, `docs/help/iam-graph.md`

### What is implemented

| Area | Status |
|------|--------|
| **Persisted attack paths** | `attack_paths` + `attack_path_edges` tables; SQLAlchemy models; `api/attack_path_builder.py` rebuilds from `findings` (limit 5000). |
| **Rebuild trigger** | After `persist_normalized_findings` (ingest) and after `native_ingest` commit; optional **`POST /attack-paths/rebuild`**; env **`OPENCNAPP_SKIP_ATTACK_PATH_REBUILD=1`** skips rebuild. |
| **API** | `GET /attack-paths` (list + summary: **by_impact**, **by_target_category** heuristic, **total_paths**), `GET /attack-paths/{id}`, `GET /attack-paths/{id}/graph` (D3 payload), `GET /attack-paths/assets?resource_id=`, `GET /attack-paths/graph` (legacy aggregate), `GET /attack-paths/story/{id}` (compat). |
| **Adapters** | `defender_for_cloud`, `aws_security_hub` registered for **`POST /ingest/{tool}`** (normalized rows). |
| **Connectors** | Multi-method: AWS (keys, IAM role, **SSO profile**), Azure (SP, **managed identity**, **az login**), GCP (SA JSON; other methods rejected in test with message). **`AddCloudWizard.tsx`** updated. |
| **Connector-triggered scan** | **`POST /connectors/{name}/scan`** — queues worker scan (default **prowler** for aws/azure/gcp, **kubescape** for kubernetes); body optional `{ "plugin", "source", "confirm_active_scan" }` (same active-scan guard as **`POST /scans/trigger`**). |
| **Dashboard** | **`/attack-paths`** — impact cards, **target category chips** (heuristic), table with **View flow**; **`/attack-paths/:pathId`** — horizontal **D3** flow (`AttackFlowGraph.tsx`), attack story, timeline, node sheet (**Findings** + **IAM graph** tabs with **React Flow** when connector + resource id present). |
| **IAM / access graph** | Tables **`graph_nodes`** / **`graph_edges`**; **`GET /graph/subgraph`**, **`POST /graph/ingest/{name}`** (recommended: PMapper / Steampipe / Cartography → JSON); optional live boto3 IAM via **`POST /graph/sync`** only when **`OPENCNAPP_IAM_LIVE_AWS_SYNC=1`** (default **off**); Celery **`iam_graph.sync`**; **`OPENCNAPP_IAM_GRAPH=0`** omits routes. |
| **Findings** | **`GET /findings?source=`** filter; each row includes **`attack_path_count`**; **`GET /findings/{id}`** includes **`attack_path_count`**. UI: **Source** column, **Paths** link when count > 0, source filter dropdown. |

### Orca Security–style UI: parity vs OpenCNAPP (honest)

Commercial UIs (e.g. Orca) combine **deep cloud graph mining** (IAM edges, effective permissions, network + identity joins) with **rich asset modals** and **MITRE-tagged** alert cards.

| Capability | Orca-style reference | OpenCNAPP today |
|------------|----------------------|-----------------|
| **Attack flow (main canvas)** | Multi-hop story: Internet → asset → IAM → crown jewel; alert diamonds; account banners | **Horizontal** Internet → source → target + **alert cards** from **findings** attached to the path; **heuristic** aggregation (cloud→resource→check style), not a full IAM permission graph. |
| **Node / asset panel (“crazy graph”)** | Second graph: roles, policies, “any principal” → bucket | **Sheet** tabs: **findings** + **IAM graph** (**React Flow** subgraph from **`/graph/subgraph`** when data exists); **not** full Orca-style dense graphs — MVP is roles + attached managed policies (AWS sync) or **ingested** exports. |
| **Scoring** | Impact / probability / risk tuned on big data | **impact_score** / **probability_score** / **risk_score** from **severity + exposure heuristics** on aggregated edges. |
| **Attack story** | Polished copy + MITRE tags | **Steps** from **finding titles/domains** via `api/services/attack_story.py`; MITRE only if **ingest** provides it in **`raw`**. |
| **Target category chips** | VM, bucket, role, etc. from asset model | **`by_target_category`** + per-row **`target_category`** from **string heuristics** on `target_resource_id` (improves as **`resource_type`** is normalized on findings). |

**Bottom line:** The **layout and tabs** (list → flow → story → side panel) are **directionally** similar; the **depth of graph semantics** (especially IAM-level edges inside the node panel) is **not** equivalent yet — that requires more **data model + collectors**, not only UI.

---

## Platform & dashboard (recent)

- **KSPM domain dashboard** (`/dashboard/kspm`) — **25 widget slots** (five wired to `/dashboard/summary?domain=kspm` + findings-by-cloud; remainder placeholders until APIs exist). See **`docs/kspm-domain-dashboard-scope.md`**, registry: `dashboard/src/config/kspmDashboardWidgets.ts`.
- **Auth** — JWT login, protected routes, axios 401 → login redirect (`dashboard/src/api/client.ts`).
- **App shell** — Sidebar, Topbar, theme, command palette (**⌘K** / **Ctrl+K**).
- **Unified dashboard** — Posture summary from `/dashboard/summary`, charts, safe JSON handling.
- **Findings** — TanStack Table, filters (**including `source`**), **`attack_path_count`**, lifecycle sheet (RHF + Zod), **empty states** (no data vs filtered).
- **Attack paths** — Persisted paths, list + detail + D3 flow (`/attack-paths`, `/attack-paths/:pathId`). See §CSPM & attack paths above.
- **Compliance** — Framework rollup, control grid route.
- **Alerts** — Rules UI; live feed **empty state** copy.
- **Plugin manager** — Empty state when no plugins synced.

---

## Connectors & inventory (Phase 2 slice)

### API (`api/routes/connectors.py`)

- `GET /connectors` — list (sanitized; no raw secrets in JSON).
- `GET /connectors/{name}` — single connector metadata + `settings`.
- `POST /connectors` — create/update (credentials encrypted server-side).
- `DELETE /connectors/{name}` — remove connector.
- `PATCH /connectors/{name}/enabled` — enable/disable.
- `PATCH /connectors/{name}` — partial update (`display_name`, `settings`, `enabled`; `credentials` only if non-empty to avoid wiping secrets).
- `POST /connectors/test` — body `{ connector_type, credentials?, settings? }`; runs provider **`test_credentials()`**.
- `POST /connectors/{name}/test` — decrypts stored credentials and runs **`test_credentials()`**.
- **`POST /connectors/{name}/scan`** — queue **Celery** scan for this connector (default plugin by type: **prowler** / **kubescape**); same **`confirm_active_scan`** rule as **`POST /scans/trigger`** for intrusive plugins.
- **Registry** connector type: `api/connectors/registry.py` (`registry` in `CONNECTOR_IMPLS`).

### Findings API (`api/routes/findings.py`)

- `GET /findings` — filters: `severity`, `domain`, `cloud_provider`, `status`, `tool`, **`source`**, `q`; sort includes **`source`**; each item includes **`attack_path_count`** (membership in persisted **`attack_paths.finding_ids`**).
- `GET /findings/{id}` — includes **`attack_path_count`**.

### Dashboard

- **Connectors page** — Entry points: **Add cloud**, **Add cluster**, **Add registry**; connector cards with **⋯** menu: Edit (cloud wizards + rename for others), Enable/Disable, Test connection, Delete.
- **`AddCloudWizard.tsx`** — Multi-step: provider (AWS/Azure/GCP), standalone vs organization, **AWS** connection methods (including **SSO profile**), **Azure** methods (service principal / managed identity / az login), regions / scan asset type, **organization scope** fields (AWS org ID / account filter, Azure management groups, GCP notes, IaC notes — no template generation), provider-specific credentials; Test + Save.
- **`AddClusterWizard.tsx`** — Kubernetes vs VM, options, generated install snippet, save as `kubernetes` or `onprem`; **Edit** prefills from `settings` (secrets not returned — re-enter token to rotate).
- **`AddRegistryModal.tsx`** — Registry kind + URL + optional credentials; `registry_url` duplicated in `settings` for display; **Edit** prefills non-secret fields.
- **UI primitives** — `components/ui/tabs.tsx`, `components/ui/separator.tsx`.

### Inventory (KSPM-oriented)

**Full detail:** see **`docs/inventory-kspm-built.md`** (routes, files, APIs, DB).

- **`GET /inventory/assets`** — Aggregated asset rows from findings; optional **`group_by=category`** returns grouped rollups with heuristic categories (`api/inventory/asset_categories.py`).
- **`GET /inventory/clouds`** — Cloud connector list (CSPM connectors).
- **`GET /inventory/clusters`** — K8s/on-prem connectors + domain-bucket finding counts + **connection_status** + inventory-derived counts (from findings or from **`k8s_clusters`** after sync).
- **`GET /inventory/namespaces`**, **`GET /inventory/workloads`** — Populated from **findings** (distinct namespaces; grouped workload-like rows). Requires `cluster_id`.
- **`GET /inventory/images`** — Image rows from CVE findings (optional `cluster_id`).
- **`POST /inventory/sync-k8s-tables`** — Materializes **`k8s_clusters`** / **`k8s_nodes`** from findings (optional cache).
- **`GET /inventory/k8s-nodes`** — Lists synced node names for a cluster connector.

### Cluster detail (`api/routes/cluster_detail.py`)

Per-connector (`cluster_id` = connector UUID) JSON APIs:

| Endpoint | Purpose |
|----------|---------|
| `GET /inventory/clusters/{id}/status` | `connection_status` (poll ~30s in UI) |
| `GET /inventory/clusters/{id}/overview` | K8s resource summary, trend, cluster_info |
| `GET /inventory/clusters/{id}/misconfigurations` | KSPM/CIS misconfig findings + insights |
| `GET /inventory/clusters/{id}/vulnerabilities` | CVE / scanner-style findings |
| `GET /inventory/clusters/{id}/alerts` | High-severity / Falco-style alert findings |
| `GET /inventory/clusters/{id}/compliance` | Compliance-domain findings |
| `GET /inventory/clusters/{id}/policies` | Controls / policy rows |
| `GET /inventory/clusters/{id}/app-behaviour` | Runtime / Falco-oriented rows |
| `GET /inventory/clusters/{id}/kiem` | Identity/RBAC-oriented rows + weighted risk score |
| `GET /inventory/clusters/{id}/cloud-assets` | Cloud-linked asset groups for cluster |

Shared query helpers: `api/inventory/helpers.py`, `api/inventory/cluster_detail_service.py`.

### Inventory UI (`dashboard/src/pages/inventory/InventoryLayout.tsx` + route children)

- **Sidebar** — **Inventory assets**: **Cloud assets**, **Cloud accounts**, **Clusters** (nested: Clusters, Namespaces, Workloads), **Images** (`dashboard/src/layout/Sidebar.tsx`).
- **Routes** — `/inventory/cloud`, `/inventory/clouds`, `/inventory/clusters`, `/inventory/namespaces`, `/inventory/workloads`, `/inventory/images`.
- **Clusters** — `ClusterTable` (TanStack); row opens **`ClusterDetailPanel`** (right **Sheet**). **Sync K8s tables** triggers POST sync. Delete via connector API.
- **Namespaces / Workloads / Cloud assets (flat)** — `InventoryDataTable` (TanStack); namespaces/workloads use **server** pagination; cloud flat list uses **client** pagination over filtered rows.
- **Cluster detail** — Tabs (Overview, Misconfiguration, Cloud Assets, Vulnerabilities, Alerts, Compliance, Policies, App behaviour, KIEM). **Tab choice persists** when closing/reopening the same cluster.
- **Components** — `SeverityBars`, `SeverityToggle`, `NoGraphData`, `K8sResourceSummary`, `FindingsByCategoryChart`.

---

## KSPM plan document

- **What is built (inventory slice):** **`docs/inventory-kspm-built.md`**
- Canonical checklist: **`docs/plans/kspm-inventory-plan.md`**
- Help (onboarding): **`docs/help/kspm-cluster-onboarding.md`**, **`docs/help/kspm-ingest-runbook.md`**

---

## Known remaining gaps (explicit)

1. **Attack path depth** — No **IAM permission graph** inside the asset panel (Orca-style second graph). Needs IAM/identity inventory + edge model beyond **findings**-only heuristics.
2. **AccuKnox-style Cloud Assets §7** — Multi-row filters, refresh/clear/export: only partially mirrored.
3. **TanStack on every surface** — Cluster list, namespaces, workloads, cloud use shared table patterns; **cluster detail** sub-tabs may still use mixed table implementations.
4. **Scheduled sync** — `k8s_clusters` / `k8s_nodes` are filled by **POST** `/inventory/sync-k8s-tables` (or UI button); no automatic scheduler unless added elsewhere.
5. **Policies tab** — Presentation is enriched when **`raw`** / normalizer provides fields; full parity depends on ingest.
6. **Deeper cloud enumeration** — Connector tests validate identity; broad per-service counts can be added per provider.
7. **Generated IaC / StackSets** — Organization onboarding UI stores scope and notes only.
8. **Registry/cluster edit** — Password / token fields are not prefilled (by design).
9. **Target category accuracy** — Chips use **string heuristics**; improves when **`resource_type`** is populated consistently across tools.

---

## Related docs

- **`docs/plan-of-action-kspm-cspm-testing.md`** — Plan of action for **management / cloud team**: KSPM → CSPM testing.
- **`docs/execplans/cspm-attack-paths.md`** — CSPM + attack paths implementation plan.
- **`docs/execplans/cloud-iam-rbac-graph.md`** — IAM/RBAC **dense graph** (Orca-style panel): schema, sync, API, React Flow; cost-aware (direct APIs vs PMapper/Steampipe/Cartography export).
- `README.md` — Quick overview and API index.
- `scripts/DEV_CONTEXT.md` — Repo layout and commands (for humans and agents).
- `docs/roadmap-gap-analysis.md` — Roadmap vs current gaps.
- `docs/plans/kspm-inventory-plan.md` — KSPM inventory UI/API checklist.
