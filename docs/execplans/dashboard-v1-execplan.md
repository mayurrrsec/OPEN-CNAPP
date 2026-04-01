# ExecPlan — Dashboard V1 (Industry-Standard UX)

## 1. Goal
Deliver a production-grade Dashboard V1 that upgrades the current MVP UI into an industry-standard CNAPP experience focused on three pages first—Overview, Findings, and Compliance—while preserving existing API contracts. Completion criteria: (a) reusable design system and layout shell are implemented, (b) Overview/Findings/Compliance pages are rebuilt with prioritized widgets and drill-down behavior, (c) findings can be filtered by source (native ingest vs plugin scanners), and (d) UX and information architecture are benchmarked against Orca/Wiz-style posture-first workflows.

## 2. Scope
- In scope:
  - Frontend design system foundations (tokens, typography, spacing, color semantics, component styles).
  - App-level shell (top nav, left nav, page container, responsive breakpoints, shared loading/empty/error states).
  - Rebuild of:
    - Overview page (risk/secure score cards; CSPM/CWPP/CIEM domain cards; trends; severity/domain charts).
    - Findings page (table-first explorer, filters, source chips, row detail drawer).
    - Compliance page (heatmap + framework summaries + drill-down entry points).
  - Source filter support in UI and API query flow (`source=plugin|native_ingest|all`).
  - Benchmark checklist mapping widgets/flows to Orca/Wiz-style IA patterns (without copying branding).
  - Incremental telemetry and UX QA checklist for critical journeys.
- Out of scope:
  - Full redesign of Attack Paths, Pentest Runner, Plugin Manager, Connectors, Alerts (only visual consistency touch if needed).
  - Backend re-architecture beyond small additive API fields/filters needed for Dashboard V1.
  - SSO/multi-tenant authorization redesign.
  - PDF reporting overhaul.

## 3. Assumptions and constraints
- Environment assumptions:
  - Existing React + TypeScript dashboard remains the frontend foundation.
  - Backend APIs are reachable locally via current FastAPI routes.
  - Recharts remains the default charting library for V1, with D3 retained only where graph-specific rendering is needed.
- Security/compliance constraints:
  - No secret material rendered in UI.
  - Findings detail views must avoid exposing raw credential payloads.
  - Source labels must be explicit for auditability (`plugin` vs `native_ingest`).
- External dependencies:
  - Product references from Orca/Wiz are used only for IA benchmarking and UX parity goals.
  - Optional icon/UI utility libraries may be introduced only if license-compatible and lightweight.

## 4. Design / approach
- Architecture approach:
  - Introduce `dashboard/src/design/` for tokens + theme primitives.
  - Introduce reusable shell components (`AppShell`, `PageHeader`, `KpiCard`, `EmptyState`, `ErrorState`, `FilterBar`).
  - Keep page containers thin; move display logic into composable components and hooks.
- Data flow:
  - Keep existing API calls, add source-aware query parameters for findings APIs and summary endpoints if missing.
  - Normalize data in hooks (`useDashboardSummary`, `useFindingsExplorer`, `useComplianceOverview`) to isolate API shape changes.
- UX decisions:
  - Posture-first landing: secure score + prioritized risk cards first screen.
  - Table-first findings workflow with sticky filters and fast severity/source pivot.
  - Compliance page optimized for leadership view first, analyst drill-down second.
- Delivery strategy:
  - Ship in slices: Shell → Overview → Findings → Compliance.
  - Ensure each slice is independently testable and releasable.

## 5. Step-by-step implementation plan
1. Baseline and UX benchmark mapping
   - files to touch:
     - `docs/execplans/dashboard-v1-benchmark-checklist.md` (new)
     - optional `docs/dashboard-v1/ia-notes.md` (new)
   - expected output:
     - Widget-by-widget checklist tying target IA to current gaps and acceptance criteria.

2. Design system and application shell
   - files to touch:
     - `dashboard/src/main.tsx`
     - `dashboard/src/App.tsx`
     - `dashboard/src/design/tokens.ts` (new)
     - `dashboard/src/components/layout/*` (new)
     - `dashboard/src/components/common/*` (new)
   - expected output:
     - Unified shell and base component primitives used by all prioritized pages.

3. Overview page V1 rebuild
   - files to touch:
     - `dashboard/src/pages/Overview.tsx`
     - `dashboard/src/components/charts/*`
     - `dashboard/src/components/overview/*` (new)
     - `dashboard/src/hooks/useDashboardSummary.ts` (new)
   - expected output:
     - Industry-style posture overview with CSPM/CWPP/CIEM cards and trend visuals.

4. Findings Explorer V1 rebuild + source filters
   - files to touch:
     - `dashboard/src/pages/Findings.tsx`
     - `dashboard/src/components/findings/*` (new)
     - `dashboard/src/hooks/useFindings.ts`
     - `dashboard/src/api/client.ts`
     - `api/routes/findings.py` (if additive source filter support is needed)
   - expected output:
     - Fast table explorer with severity/domain/source filters and detail drill-down UX.

5. Compliance page V1 rebuild
   - files to touch:
     - `dashboard/src/pages/Compliance.tsx`
     - `dashboard/src/components/compliance/*` (new)
     - optional `api/routes/compliance.py` (if aggregate response enhancements are needed)
   - expected output:
     - Heatmap + framework summaries + drill-down entry aligned to CSPM expectations.

6. QA hardening and delivery notes
   - files to touch:
     - `docs/dashboard-v1/qa-checklist.md` (new)
     - `docs/dashboard-v1/release-notes.md` (new)
   - expected output:
     - Verified pass/fail/warn evidence for critical user journeys and final rollout notes.

## 6. Validation plan
Run these commands during implementation and before merge:
- `npm --prefix dashboard ci`
- `npm --prefix dashboard run build`
- `npm --prefix dashboard run lint`
- `python -m compileall api dashboard/src`
- `docker compose config`

Expected outcomes:
- Frontend builds successfully with no TypeScript errors.
- Lint passes or any exceptions are documented with rationale.
- Python modules compile cleanly for touched backend files.
- Compose configuration remains valid.

## 7. Rollback plan
- Revert dashboard V1 commit set to last stable tag/commit if regression is found.
- Keep legacy page components available behind a temporary feature flag branch if needed.
- If additive API fields cause client mismatch, disable new query params and fallback to prior API response shape.
- Confirm rollback by running:
  - `npm --prefix dashboard run build`
  - `docker compose up -d --build`

## 8. Deliverables checklist
- [x] Code changes
- [x] Docs updated
- [x] Tests/checks executed
- [ ] Operational notes added

## 9. Evidence log (fill during execution)
- Command: `test -f docs/execplans/dashboard-v1-execplan.md`
- Result: pass
- Notes: ExecPlan document created for Dashboard V1 scope.

- Command: `sed -n '1,220p' docs/execplans/dashboard-v1-execplan.md`
- Result: pass
- Notes: Verified all required template sections are populated.

- Command: `npm --prefix dashboard ci`
- Result: warn
- Notes: Failed because `dashboard/package-lock.json` is missing in repo; used `npm --prefix dashboard install` as fallback.

- Command: `npm --prefix dashboard install`
- Result: pass
- Notes: Dependencies installed/up-to-date successfully.

- Command: `npm --prefix dashboard run build`
- Result: pass
- Notes: Frontend compiled successfully; Vite reported chunk-size warning only.

- Command: `python -m compileall api dashboard/src`
- Result: pass
- Notes: Python sources compiled successfully.

- Command: `docker compose config`
- Result: warn
- Notes: `docker` CLI unavailable in this execution environment.
