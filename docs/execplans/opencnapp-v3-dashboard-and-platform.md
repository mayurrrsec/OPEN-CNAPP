# ExecPlan: OpenCNAPP v3 — align implementation to spec (platform + industry-standard dashboard)

## 1. Goal
Bring the current OpenCNAPP codebase into alignment with `raw cnapp idea/opencnapp_final_spec_v3.md` by implementing the missing “industry-standard” dashboard UX and the supporting API aggregation endpoints/data flows. Completion criteria: Docker Compose brings up a working UI that matches the spec’s pages (Overview, Findings Explorer, Attack Paths, Pentest Runner, Plugin Manager, Connectors, Alerts, Compliance) with real charts/tables/filters driven from the database, plus baseline workflows (scan trigger, progress, finding lifecycle, notifications).

## 2. Scope
- In scope:
  - Dashboard UX overhaul to match spec section 6 (layout, cards, charts, tables, filters).
  - API endpoints needed for dashboard aggregations (overview stats, trends, top findings, compliance breakdowns).
  - Findings Explorer: pagination, sorting, multi-filtering, lifecycle actions (assign/accept risk/mark fixed) per spec.
  - Attack Paths: upgrade from placeholder radial SVG to D3 force-directed graph with basic node/edge types.
  - Connectors/Plugins screens: usable CRUD/config forms (not JSON dumps).
  - Docker Compose improvements for reproducible dev/prod-like run.
- Out of scope:
  - Full enterprise SSO/OIDC (keep JWT/local for now unless already present).
  - Full asset inventory graph + toxic-combo correlation beyond the initial D3 graph.
  - Helm chart productionization (defer unless required for this task).

## 3. Assumptions and constraints
- Environment assumptions
  - Windows host (PowerShell) running Docker Desktop.
  - `docker compose up` is the primary dev workflow.
  - Dashboard is Vite/React and runs on `localhost:3000` mapped to Vite `5173` in compose.
- Security/compliance constraints
  - No secrets committed to git.
  - Credentials remain encrypted at rest (existing `api/crypto.py`) and not logged.
  - Active scanning tools remain gated by explicit user confirmation.
- External dependencies
  - Existing charting libs (Recharts) and D3 for graph rendering.
  - Existing Postgres schema in `api/database/init.sql`.

## 4. Design / approach
- Keep the existing API route structure but add **dashboard-focused aggregation endpoints** to avoid doing heavy joins/group-bys in the browser.
- Convert the dashboard from inline-style “demo pages” to a cohesive layout:
  - Navigation sidebar/topbar, consistent typography, spacing, and cards.
  - Reusable components for filter bars, tables, and charts.
- Findings Explorer becomes the “core” page, modelled after Wiz/Orca:
  - Server-side pagination + filtering + sorting.
  - Drill-down drawer/detail view for a finding with remediation and raw JSON.
  - Lifecycle actions (status transitions, assign, ticket link).
- Attack Paths:
  - Phase 1: D3 force graph based on `Finding` relations we can infer (cloud → resource → check).
  - Phase 2: enrich with connector-provided relationships (optional).

## 5. Step-by-step implementation plan
1. Baseline inventory + gap analysis against spec
   - files to touch: none (analysis only)
   - expected output: checklist of “spec-required” vs “currently implemented”
2. Dashboard foundation UI (layout + design system choices)
   - files to touch: `dashboard/src/App.tsx`, new `dashboard/src/layout/*`, shared components
   - expected output: consistent navigation + page shells matching spec
3. Overview page: real cards + charts + top critical findings
   - files to touch: `api/routes/dashboard.py`, `dashboard/src/pages/Overview.tsx`, charts components
   - expected output: secure score, counts, donut/bar/line, top 5 critical list
4. Findings Explorer v1: table w/ multi-filters + pagination + details
   - files to touch: `api/routes/findings.py`, `dashboard/src/pages/Findings.tsx`, new table components
   - expected output: fast filter/sort, open/accepted/fixed workflow, export
5. Compliance page: framework selector + heatmap grid
   - files to touch: `api/routes/compliance.py`, `dashboard/src/pages/Compliance.tsx`, `dashboard/src/components/charts/ComplianceHeatmap.tsx`
   - expected output: heatmap (pass/fail/partial counts), per-control drilldown stub
6. Plugins + Connectors: usable manager UIs
   - files to touch: `dashboard/src/pages/PluginManager.tsx`, `dashboard/src/pages/Connectors.tsx`, relevant API routes if needed
   - expected output: enable/disable, config editing, connector test, native ingest toggles
7. Attack Paths v1: D3 force graph + node details
   - files to touch: `api/routes/attack_paths.py`, `dashboard/src/pages/AttackPaths.tsx`
   - expected output: interactive graph with click-to-inspect panel
8. Alerts: real-time feed + rules UX polish
   - files to touch: `dashboard/src/pages/Alerts.tsx`, `api/routes/alerts.py`
   - expected output: live stream view + rule CRUD
9. Docker Compose improvements + docs
   - files to touch: `docker-compose.yml`, `README.md` (if needed)
   - expected output: one-command run with stable ports and env

## 6. Validation plan
- `docker compose up --build`
  - Expected: `api` healthy on `http://localhost:8000/health`, `dashboard` on `http://localhost:3000`
- `curl http://localhost:8000/dashboard/summary`
  - Expected: JSON with counts + breakdown arrays (non-error)
- Manual UI checks (browser)
  - Overview charts render and update with seeded findings
  - Findings page filters/pagination work
  - Compliance heatmap renders
  - Attack Paths graph renders and is interactive

## 7. Rollback plan
- Revert to previous UI by resetting `dashboard/src/*` changes (git revert or checkout).
- Revert API aggregation endpoints without altering core ingestion schema.
- Keep database schema backward compatible; if migrations are needed, apply additive changes only.

## 8. Deliverables checklist
- [ ] Code changes
- [ ] Docs updated (if workflow changes)
- [ ] Validation commands executed (with outcomes)
- [ ] Operational notes added (ports, env vars, profiles)

## 9. Evidence log (fill during execution)
- Command:
- Result:
- Notes:

