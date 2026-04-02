# Implementation status (living document)

This file records **what is implemented in the repo today** (not roadmap intent). Update it when you merge meaningful features. For roadmap vs gaps, see `docs/roadmap-gap-analysis.md`.

**Last updated:** 2026-04-02 (KSPM inventory + cluster detail slice)

---

## How we work from here (process)

To avoid half-finished surface area across CSPM, KSPM, CWPP, etc., prefer **one domain or one vertical slice per iteration**:

1. **Pick a scope** — e.g. CSPM (cloud posture), KSPM (Kubernetes), registry scanning, alerts, compliance, connectors only, etc.
2. **Define done** — API contract + UI + empty/error states + docs note in this file.
3. **Ship it** — merge, then move to the next domain.

Larger cross-cutting work (global search, SSO hardening) should still be scheduled explicitly so dashboard pages do not all drift in parallel.

---

## Platform & dashboard (recent)

- **Auth** — JWT login, protected routes, axios 401 → login redirect (`dashboard/src/api/client.ts`).
- **App shell** — Sidebar, Topbar, theme, command palette (**⌘K** / **Ctrl+K**).
- **Unified dashboard** — Posture summary from `/dashboard/summary`, charts, safe JSON handling. **Do not** add a second full-width “Add cloud” empty state in the page body; the primary action stays in the **top bar** (this branch never shipped a centered duplicate CTA in `UnifiedDashboard.tsx`).
- **Findings** — TanStack Table, filters, lifecycle sheet (RHF + Zod), **empty states** (no data vs filtered).
- **Attack paths** — Graph + story route `/attack-paths/:pathId`, empty state when graph has no nodes.
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
- `POST /connectors/test` — body `{ connector_type, credentials?, settings? }`; runs provider **`test_credentials()`** (AWS STS / assume role + optional Organizations list, Azure Resource Manager resource groups, GCP Cloud Resource Manager project GET, registry `/v2/` probe, etc.).
- `POST /connectors/{name}/test` — decrypts stored credentials and runs the same **`test_credentials()`** checks.
- **Registry** connector type: `api/connectors/registry.py` (`registry` in `CONNECTOR_IMPLS`).

### Dashboard

- **Connectors page** — Entry points: **Add cloud**, **Add cluster**, **Add registry**; connector cards with **⋯** menu: Edit (cloud wizards + rename for others), Enable/Disable, Test connection, Delete.
- **`AddCloudWizard.tsx`** — Multi-step: provider (AWS/Azure/GCP), standalone vs organization, connection method, regions / scan asset type, **organization scope** fields (AWS org ID / account filter, Azure management groups, GCP notes, IaC notes — no template generation), provider-specific credentials; Test + Save.
- **`AddClusterWizard.tsx`** — Kubernetes vs VM, options, generated install snippet, save as `kubernetes` or `onprem`; **Edit** prefills from `settings` (secrets not returned — re-enter token to rotate).
- **`AddRegistryModal.tsx`** — Registry kind + URL + optional credentials; `registry_url` duplicated in `settings` for display; **Edit** prefills non-secret fields.
- **UI primitives** — `components/ui/tabs.tsx`, `components/ui/separator.tsx`.

### Inventory (KSPM-oriented)

- **`GET /inventory/assets`** — Aggregated asset rows from findings; optional **`group_by=category`** returns grouped rollups with heuristic categories (`api/inventory/asset_categories.py`).
- **`GET /inventory/clouds`** — Cloud connector list for **Clouds** tab.
- **`GET /inventory/clusters`** — K8s/on-prem connectors + domain-bucket finding counts + **connection_status** from latest findings.
- **`GET /inventory/namespaces`**, **`GET /inventory/workloads`** — Stubs (empty lists) until inventory sync writes namespace/workload rows.
- **`GET /inventory/images`** — Image rows from CVE findings (optional `cluster_id`).

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
| `GET /inventory/clusters/{id}/policies` | Controls grouped by `check_id` |
| `GET /inventory/clusters/{id}/app-behaviour` | Runtime / Falco-oriented rows |
| `GET /inventory/clusters/{id}/kiem` | Identity/RBAC-oriented rows + weighted risk score |
| `GET /inventory/clusters/{id}/cloud-assets` | Cloud-linked asset groups for cluster |

Shared query helpers: `api/inventory/helpers.py`, `api/inventory/cluster_detail_service.py`.

### Inventory UI (`dashboard/src/pages/Inventory.tsx`)

- Tabs: **Clouds**, **Clusters**, **Namespaces**, **Workloads**, **Images** (plus compliance coverage card where applicable).
- **Clusters** — `ClusterTable` (TanStack Table), row opens **`ClusterDetailPanel`** (right `Dialog`, wide). Delete via connector API.
- **Cluster detail** — Tabs per plan (Overview, Misconfiguration, Cloud Assets, Vulnerabilities, Alerts, Compliance, Policies, App behaviour, KIEM). **Tab choice persists** when closing/reopening the same cluster; resets when selecting a different cluster.
- **Components** — `SeverityBars`, `SeverityToggle`, `NoGraphData`, `K8sResourceSummary`, `FindingsByCategoryChart` (misconfiguration insights).

---

## KSPM plan document

- Canonical spec: **`docs/plans/kspm-inventory-plan.md`** (copy of the working group plan).
- Help doc cross-link: **`docs/help/kspm-cluster-onboarding.md`** (Inventory + API table).

---

## Known remaining gaps (explicit)

1. **TanStack Table “full” spec** — Cluster and several detail tables use tables + server pagination; not all columns from the plan (checkboxes, column toggles, AccuKnox-style pagination footer) are implemented.
2. **Namespaces / Workloads inventory** — API stubs; no sync pipeline populating rows yet.
3. **Cloud Assets (global)** — `/inventory/assets?group_by=category` implemented; the **Clouds** tab is still connector-centric, not the full AccuKnox multi-filter / grouped UI from §7 of the plan.
4. **Dedicated K8s tables** — Plan suggests `k8s_clusters`, `k8s_nodes`, etc.; current implementation derives metrics from **findings** + **connectors** until agents persist inventory rows.
5. **Policies tab** — Rows are **check_id** rollups with severity breakdowns, not full AccuKnox policy columns (selector labels, namespace scope, etc.).
6. **Deeper cloud enumeration** — Connector tests validate identity; broad per-service counts can be added per provider.
7. **Generated IaC / StackSets** — Organization onboarding UI stores scope and notes only.
8. **Registry/cluster edit** — Password / token fields are not prefilled (by design).

---

## Related docs

- `README.md` — Quick overview and API index.
- `scripts/DEV_CONTEXT.md` — Repo layout and commands (for humans and agents).
- `docs/roadmap-gap-analysis.md` — Roadmap vs current gaps.
- `docs/plans/kspm-inventory-plan.md` — KSPM inventory UI/API checklist.
- `raw cnapp idea/Opencnapp kspm inventory plan.md` — May duplicate the plan on some clones; prefer **`docs/plans/`** as the tracked canonical path.
