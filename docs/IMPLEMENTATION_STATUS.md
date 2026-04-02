# Implementation status (living document)

This file records **what is implemented in the repo today** (not roadmap intent). Update it when you merge meaningful features. For roadmap vs gaps, see `docs/roadmap-gap-analysis.md`.

**Last updated:** 2026-04-02 (connectors + empty states pass)

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
- **Unified dashboard** — Posture summary from `/dashboard/summary`, charts, safe JSON handling (add-cloud CTA lives in the top bar).
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

### Inventory

- **`GET /inventory/assets`** (`api/routes/inventory_api.py`) — Aggregated asset rows from findings.
- **Inventory page** — Tabs: Assets (table), Clusters (heuristic / empty state), Workloads (placeholder); compliance empty card.

---

## Known remaining gaps (explicit)

1. **Deeper cloud enumeration** — Connector tests validate identity and minimal resource visibility; broad asset counts (per service) can be added per provider.
2. **Generated IaC / StackSets** — Organization onboarding UI stores scope and notes only; templates are not generated or applied from OpenCNAPP.
3. **KSPM vertical** — Next planned focus: Kubernetes posture flows (policies, benchmarks, in-cluster inventory) beyond connector + inventory stubs.
4. **Registry/cluster edit** — Password / token fields are not prefilled (by design); paste new values to rotate.

---

## Related docs

- `README.md` — Quick overview and API index.
- `scripts/DEV_CONTEXT.md` — Repo layout and commands (for humans and agents).
- `docs/roadmap-gap-analysis.md` — Roadmap vs current gaps.
- `raw cnapp idea/opencnapp_dashboard_implementation_plan.md` — Source plan (if present in clone).
