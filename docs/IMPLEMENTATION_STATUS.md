# Implementation status (living document)

This file records **what is implemented in the repo today** (not roadmap intent). Update it when you merge meaningful features. For roadmap vs gaps, see `docs/roadmap-gap-analysis.md`.

**Last updated:** 2026-04-02

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
- **Unified dashboard** — Posture summary from `/dashboard/summary`, charts, safe JSON handling.
- **Findings** — TanStack Table, filters, lifecycle sheet (RHF + Zod).
- **Attack paths** — Graph + story route `/attack-paths/:pathId`.
- **Compliance** — Framework rollup, control grid route.
- **Alerts** — Rules UI (as present in branch).

---

## Connectors & inventory (Phase 2 slice)

### API (`api/routes/connectors.py`)

- `GET /connectors` — list (sanitized; no raw secrets in JSON).
- `GET /connectors/{name}` — single connector metadata + `settings`.
- `POST /connectors` — create/update (credentials encrypted server-side).
- `DELETE /connectors/{name}` — remove connector.
- `PATCH /connectors/{name}/enabled` — enable/disable.
- `PATCH /connectors/{name}` — partial update (`display_name`, `settings`, `enabled`; `credentials` only if non-empty to avoid wiping secrets).
- `POST /connectors/test` — body `{ connector_type, credentials?, settings? }` for validation without persisting (provider `validate()` + optional `list_resources` count).
- `POST /connectors/{name}/test` — test saved connector by implementation name.
- **Registry** connector type: `api/connectors/registry.py` (`registry` in `CONNECTOR_IMPLS`).

### Dashboard

- **Connectors page** — Entry points: **Add cloud**, **Add cluster**, **Add registry**; connector cards with **⋯** menu: Edit (cloud wizards + rename for others), Enable/Disable, Test connection, Delete.
- **`AddCloudWizard.tsx`** — Multi-step: provider (AWS/Azure/GCP), standalone vs organization, connection method, regions / scan asset type, provider-specific credentials (e.g. AWS keys vs IAM role fields; Azure app registration fields; GCP service account fields); Test + Save.
- **`AddClusterWizard.tsx`** — Kubernetes vs VM, options, generated install snippet, save as `kubernetes` or `onprem`.
- **`AddRegistryModal.tsx`** — Registry kind + URL + optional credentials; save as `registry`.
- **UI primitives** — `components/ui/tabs.tsx`, `components/ui/separator.tsx`.

### Inventory

- **`GET /inventory/assets`** (`api/routes/inventory_api.py`) — Aggregated asset rows from findings.
- **Inventory page** — Tabs: Assets (table), Clusters (heuristic / empty state), Workloads (placeholder); compliance empty card.

---

## Known remaining gaps (explicit)

These are **not** bugs per se; they are the next increments:

1. **Real cloud tests** — `POST /connectors/test` still relies on connector `validate()` stubs; real AWS STS / Azure ARM / GCP API checks are a follow-up.
2. **Org / Terraform flows** — AWS Organizations StackSet, Azure org Terraform, etc., are only partially reflected in settings; full generated IaC UX is not implemented.
3. **Plan empty states** — Not every page from the product plan (Unified Dashboard, Findings, Attack Paths, Alerts, Plugins, etc.) has the final empty-state copy/CTAs; Inventory + partial compliance card were updated in this slice.
4. **Edit registry/cluster** — Non-cloud **Edit** is rename-oriented; full wizard prefill for registries/clusters can be added later.

---

## Related docs

- `README.md` — Quick overview and API index.
- `scripts/DEV_CONTEXT.md` — Repo layout and commands (for humans and agents).
- `docs/roadmap-gap-analysis.md` — Roadmap vs current gaps.
- `raw cnapp idea/opencnapp_dashboard_implementation_plan.md` — Source plan (if present in clone).
