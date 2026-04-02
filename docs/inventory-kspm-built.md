# KSPM inventory — what is built (as of 2026-04-02)

This document describes **what exists in the repository today** for the Kubernetes / inventory slice (KSPM-oriented UI and APIs). It complements the aspirational checklist in `docs/plans/kspm-inventory-plan.md` and the living status file `docs/IMPLEMENTATION_STATUS.md`.

---

## Summary

| Area | Status |
|------|--------|
| Inventory navigation (sidebar) | **Done** — Cloud assets, Clusters (nested: Clusters / Namespaces / Workloads), Images |
| Nested routes | **Done** — `/inventory/cloud`, `/inventory/clusters`, `/inventory/namespaces`, `/inventory/workloads`, `/inventory/images` ( `/inventory` redirects to `/inventory/cloud`) |
| Cloud assets (CSPM findings aggregation) | **Done** — Group by category with expand; flat list mode; provider filter; search |
| Clusters table | **Done** — TanStack Table: row selection, column visibility, pagination footer |
| Namespaces / workloads inventory | **Done** — Backed by **findings** (distinct namespaces; grouped workload-like rows), paginated API |
| Cluster detail panel | **Done** — Right **Sheet** (not full-page dialog); tabs with dedicated APIs |
| Policies tab (cluster) | **Done** — Enriched rows where ingest provides fields (name, category, namespaces, alerts, selectors, tags, severity) |
| Optional DB cache | **Done** — `k8s_clusters`, `k8s_nodes` + `POST /inventory/sync-k8s-tables`; cluster counts prefer DB when synced |
| AccuKnox 1:1 parity | **Not a goal for “done”** — Multi-row filters, org/OU, date-discovered filters, etc. are partial or future |

---

## Dashboard — routes and files

| Route | Purpose |
|-------|---------|
| `/inventory` | Redirects to `/inventory/cloud` |
| `/inventory/cloud` | Cloud assets tab (`CloudAssetsInventoryTab`) — CSPM asset aggregation from findings only |
| `/inventory/clusters` | Cluster inventory table + onboarding actions + **Sync K8s tables** |
| `/inventory/namespaces` | Namespace inventory (cluster selector + table) |
| `/inventory/workloads` | Workload inventory (cluster + filters + table) |
| `/inventory/images` | Image / CVE-oriented rows from findings |

**Layout:** `dashboard/src/pages/inventory/InventoryLayout.tsx` — shared header, compliance coverage placeholder card, `ClusterDetailPanel` (sheet).

**Shared table component:** `dashboard/src/components/inventory/InventoryDataTable.tsx` — checkbox column, **Columns** menu, rows/page, first/prev/next/last pagination. Used for namespaces, workloads, and cloud assets (flat mode). Grouped cloud view uses the same toolbar patterns (columns + paging + expand rows).

**Cluster list:** `dashboard/src/pages/inventory/ClusterTable.tsx` — TanStack Table (row selection, column toggles, pagination).

**Cluster detail:** `dashboard/src/pages/inventory/ClusterDetailPanel.tsx` — uses `dashboard/src/components/ui/sheet.tsx` (right-side panel).

**Sidebar:** `dashboard/src/layout/Sidebar.tsx` — **Inventory assets** expandable section (Findings block above it unchanged).

**App routes:** `dashboard/src/App.tsx` — nested `<Route path="/inventory">` children.

---

## API — inventory endpoints

Base path: `/inventory` (authenticated unless noted otherwise in your deployment).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/inventory/assets` | Aggregated cloud assets from findings; optional `group_by=category`, `cloud_provider`, `limit` |
| GET | `/inventory/clouds` | Cloud (CSPM) connectors list |
| GET | `/inventory/clusters` | K8s/on-prem connectors + finding rollups + connection status + inventory-derived counts |
| GET | `/inventory/namespaces` | Namespaces from findings for `cluster_id` (required); `search`, `page`, `limit` |
| GET | `/inventory/workloads` | Workload-like groups from findings; `cluster_id` (required); `namespace`, `kind`, `search`, `page`, `limit` |
| GET | `/inventory/images` | Image/CVE rows from findings |
| POST | `/inventory/sync-k8s-tables` | Upserts `k8s_clusters` and replaces `k8s_nodes` from current findings |
| GET | `/inventory/k8s-nodes` | Materialized node names after sync (`cluster_id` query param) |

**Implementation modules:** `api/routes/inventory_api.py`, `api/inventory/namespaces_workloads.py`, `api/inventory/asset_categories.py`, `api/inventory/cluster_detail_service.py`, `api/inventory/k8s_sync.py`.

**Cluster detail APIs** (per connector `cluster_id`): `api/routes/cluster_detail.py` — overview, misconfigurations, vulnerabilities, alerts, compliance, policies, app-behaviour, kiem, cloud-assets, status (see `docs/IMPLEMENTATION_STATUS.md` table).

---

## Database — optional K8s tables

Defined in `api/database/init.sql`:

- **`k8s_clusters`** — One row per Kubernetes/on-prem **connector** (`connector_id` PK): cached `nodes_count`, `workloads_count`, `namespaces_count`, `synced_at`.
- **`k8s_nodes`** — Node names inferred from findings (`resource_type` contains `node`, `resource_name` set).

SQLAlchemy models: `api/models/k8s_cluster.py`, `api/models/k8s_node.py`.

**When sync has run:** `cluster_info_from_findings` in `api/inventory/cluster_detail_service.py` uses these counts for nodes/workloads/namespaces when `synced_at` is set; **active_policies** still comes from findings.

---

## Operational notes

1. **Sync** — Until `POST /inventory/sync-k8s-tables` runs (or the **Sync K8s tables** button on Clusters), inventory counts are derived directly from **findings** in code paths that do not read `k8s_clusters`.
2. **Ingest quality** — Policies tab columns depend on **`raw`** / normalizer shape from scanners (e.g. Kubescape); empty fields are expected if the tool does not emit them.
3. **Cloud assets vs Clouds** — **Cloud assets** is findings-based aggregation; **Clouds** (`/inventory/clouds`) remains connector-centric. The **Cloud assets** route is the primary “AccuKnox-style” asset view for CSPM.

---

## Related documentation

- `docs/plans/kspm-inventory-plan.md` — Original UI/API checklist (includes many optional AccuKnox items).
- `docs/IMPLEMENTATION_STATUS.md` — Repo-wide implementation status.
- `docs/help/kspm-cluster-onboarding.md` — Onboarding help.
