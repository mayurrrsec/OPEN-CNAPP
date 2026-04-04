# ExecPlan: CSPM integration + Orca-style attack paths

This document is the **Cursor-ready end-to-end plan** for cloud CSPM posture workflows, **multi-method cloud connectors**, and **attack path** UX modeled after commercial CNAPP UIs (reference: [Orca CSPM](https://orca.security/platform/cloud-security-posture-management-cspm/)). Implementation should follow this file until completion criteria are met.

**Architecture diagram (authoritative flow):** [cspm_attack_path_architecture.svg](./cspm_attack_path_architecture.svg)

---

## 1. Goal

Deliver a **coherent CSPM and attack-path experience** where:

1. **Cloud connectors** support multiple connection methods (AWS: access keys, IAM role, org-style settings; Azure: service principal, managed identity, CLI login; GCP: service account JSON as today), validated via existing connector test hooks where applicable.
2. **Findings remain the single source of truth** — CSPM, KSPM, Defender for Cloud, Security Hub, secrets, IaC, image-sec, CWPP, CIEM: all land in `findings` with `domain`, `tool`, `source`, and normalized resource fields.
3. **Attack paths** are **first-class persisted entities** (not only an in-memory graph): list view with Orca-style **impact bands**, **target category** filters, and **grouped rows**; detail view with **horizontal attack-flow graph**, **attack story**, **timeline**, and **node side panel** fed by APIs.
4. **Completion criteria:** (a) documented connector matrix tested for at least one path per major cloud; (b) `GET /attack-paths` returns summary + paginated paths backed by DB; (c) `GET /attack-paths/{id}/graph` returns D3-ready layout; (d) dashboard **Attack Paths** page matches the planned IA (list → detail → panel); (e) native-ingest tools (Defender / Security Hub) normalize into `findings` and participate in path building where data allows.

---

## 2. Scope

### In scope

- Connector **settings schema** extensions (`connection_method`, org filters, regions, role ARN, external ID, SSO profile name) and backend validation in `api/connectors/aws.py`, `api/connectors/azure.py`, `api/connectors/gcp.py` as needed.
- **AddCloudWizard** (`dashboard/src/components/connectors/AddCloudWizard.tsx`): conditional fields per method and account type (standalone vs organization).
- **Schema:** new tables `attack_path_edges`, `attack_paths` (or equivalent normalized design) — align with `api/database/init.sql` and SQLAlchemy models (this repo uses `init.sql` + models; add migration notes if a separate migration file is introduced).
- **Attack path builder** service: runs after ingest batches (sync or async) to compute edges/paths from `Finding` rows across domains.
- **API:** replace/extend `api/routes/attack_paths.py` with list, detail, graph, optional `POST /attack-paths/rebuild`, asset detail for node panel.
- **Adapters:** harden `defender_for_cloud`, `aws_security_hub` (and stubs for others as prioritized) so native ingest produces normalized findings.
- **Frontend:** rewrite `AttackPaths.tsx`, add `AttackPathDetail` route, new `components/attack-paths/*`, extend `dashboard/src/api/attackPaths.ts`.
- **Findings UI:** optional columns/filters for `source`, `has_attack_path`, cross-links from findings to attack paths.

### Out of scope (later phases)

- Full **PDF export**, **third-party ticketing**, and **production-grade graph analytics** at Orca scale.
- **Automatic** crown-jewel tagging from external CMDBs (may use heuristics + manual flag in DB later).
- **Helm agent** parity for CSPM (K8s agents remain separate).

---

## 3. Assumptions and constraints

- **Environment:** Docker Compose stack; API SQLite (`opencnapp.db`) or configured DB; Celery worker for scans.
- **Security:** Connector secrets stay encrypted at rest per existing connector storage; attack path tables must not duplicate raw secrets from `raw` JSON.
- **Data realism:** Attack paths are **derived** from correlations (resource IDs, identities, exposure patterns). v1 may use **heuristic** edges; document confidence in API responses.
- **Multi-domain:** User expectation is correct: **attack paths are not CSPM-only** — any finding that participates in an edge (exposure, vuln, IAM, lateral movement) can appear. Defender findings **must** be normalized with `domain`/`tool`/`source` set so the builder can include them.
- **Dependencies:** boto3 / Azure SDK / existing ingest pipeline; D3 (or already-used graph libs) in dashboard.

---

## 4. Design / approach

### 4.1 Reference architecture (see SVG)

1. **Cloud connectors** → **Ingest service** (scanner adapters) and **Native ingest** (Defender, Security Hub).
2. Both converge on **`findings`** (all domains).
3. **Attack path builder** reads findings, writes **`attack_paths`** + **`attack_path_edges`**.
4. **API** exposes list, detail, graph, asset panel.
5. **UI:** list (filters, groups) → detail (scores, horizontal flow) → node panel; story + timeline below graph.

### 4.2 Current codebase baseline (must read before coding)

| Area | Location | Today |
|------|----------|--------|
| Attack graph | `api/routes/attack_paths.py` | In-memory graph from up to 1000 findings; heuristic cloud→resource→check edges |
| AWS connector | `api/connectors/aws.py` | Access keys + optional `assume_role` (role ARN / external ID) in `test_credentials` |
| Finding model | `api/models/finding.py` | Has `tool`, `source`, `domain`, `resource_*`, `account_id`, fingerprint |
| Dashboard | `dashboard/src/pages/AttackPaths.tsx`, `api/attackPaths.ts` | v1 placeholder / thin client |

### 4.3 Attack path builder (conceptual)

- **Inputs:** findings filtered by connector/account when rebuilding scoped paths.
- **Edge types (examples):** `exposed_to_internet`, `has_vuln`, `identity_can_access`, `lateral_movement` — store as strings.
- **Scoring:** Orca-style **impact** 0–99 from severity weights, exposure multiplier, path length penalty; **probability** may mirror severity/confidence heuristics in v1.
- **Persistence:** Each **path** row: title, scores, exposure flags, `path_length`, `connector_id` FK to `connectors.id`, `account_id`, JSON arrays of finding IDs / edge IDs, timestamps.
- **Trigger:** After `persist_normalized_findings` commit, enqueue **rebuild** (Celery task preferred so ingest stays fast) or guarded inline for small batches.

### 4.4 API shape (illustrative — finalize during implementation)

- `GET /attack-paths` — query: impact band, `target_category`, `cloud_provider`, `account_id`, `exposed`, pagination, sort; response: `summary` counts + `items[]`.
- `GET /attack-paths/{path_id}` — metadata, findings ordered, `attack_story` steps, timeline hints.
- `GET /attack-paths/{path_id}/graph` — `{ nodes, edges, alert_cards }` for horizontal D3 layout.
- `GET /attack-paths/assets/{resource_id}` — node panel (query params for `connector_id` if needed).
- `POST /attack-paths/rebuild` — admin/maintenance rebuild.

### 4.5 Frontend IA

- **Orca-like list:** top summary cards (impact + target category + target type chips), tabs **Attack paths / Alerts / Assets** as **in-page state** (same route OK).
- **Detail:** breadcrumb, impact/probability/risk, **horizontal** flow (not force-directed), legend asset / alert / crown jewel.
- **Node click:** right **Sheet** with asset summary, related findings, optional mini-graph.

### 4.6 Impact band mapping (v1)

| Band | Impact score |
|------|----------------|
| High | ≥ 70 |
| Medium | 40–69 |
| Low | 1–39 |
| Informational | 0 |

---

## 5. Step-by-step implementation plan

Implement in this order to reduce circular dependencies.

### Phase A — Connectors (multi-method)

1. **Schema & validation** — Extend connector `settings` / credential expectations in code; document allowed keys in this file’s deliverables.
   - Files: `api/connectors/aws.py`, `api/connectors/azure.py`, `api/connectors/gcp.py`, `api/connectors/base.py` if shared helpers.
   - Output: `test_credentials` supports documented methods; clear error messages.

2. **AddCloudWizard** — Step 2/3 fields driven by `connection_method` and account type (standalone vs org).
   - Files: `dashboard/src/components/connectors/AddCloudWizard.tsx`, shared types if any.
   - Output: Wizard stores settings the API persists today (`POST /connectors` or equivalent).

### Phase B — Database & models

3. **SQL + models** — Add `attack_path_edges`, `attack_paths` to `api/database/init.sql`; add `api/models/attack_path.py` (and edge model if separate); export in `api/models/__init__.py`.
   - Output: New installs get tables; document manual migration for existing DBs.

### Phase C — Ingest & adapters

4. **Native adapters** — Implement or harden normalizers for Defender and Security Hub (structured severity, resource IDs, titles).
   - Files: `api/adapters/defender_for_cloud.py`, `api/adapters/aws_security_hub.py`, `api/adapters/registry.py`.
   - Output: Ingest produces consistent `findings` rows with `source` = `native_ingest` (or project convention).

5. **Optional: connector-triggered CSPM scan** — If `POST /connectors/{name}/scan` is added, wire to existing scan/worker pipeline (Prowler etc.).
   - Files: `api/routes/` (connectors or scans), worker.

### Phase D — Attack path builder & story

6. **`api/attack_path_builder.py`** — Build edges/paths from findings; idempotent rebuild.
7. **`api/services/attack_story.py`** — Generate step list from ordered findings + accounts.
8. **`api/ingest_service.py`** — Trigger rebuild task after successful persist (pattern: Celery `apply_async` or FastAPI `BackgroundTasks`).

### Phase E — Attack paths API

9. **Rewrite/extend `api/routes/attack_paths.py`** — List, detail, graph, asset, rebuild endpoints; remove reliance on purely ephemeral graph for primary UX (keep legacy endpoint only if needed for backward compatibility during transition).

### Phase F — Dashboard

10. **`dashboard/src/api/attackPaths.ts`** — Typed clients for new endpoints.
11. **Components** — `AttackFlowGraph.tsx` (horizontal D3), `NodeDetailPanel.tsx`, `AttackStory.tsx`, `ImpactScoreBar.tsx`, `TargetCategoryFilter.tsx`, `AlertCard.tsx`, `AccountBanner.tsx`.
12. **Pages** — Rewrite `AttackPaths.tsx`; add `AttackPathDetail.tsx` + routes in `App.tsx`.
13. **`Findings.tsx`** — Optional: `source` filter, link/badge for attack path membership.

### Phase G — Tests & docs

14. **Tests** — Unit tests for builder scoring and API; smoke test for graph JSON shape.
15. **Docs** — Update `docs/help/` or README snippet: connector methods + attack path rebuild + “findings are multi-domain.”

---

## 6. Validation plan

Run and record pass/fail:

- `python -m unittest discover -s tests -p "test_*.py"`
- `python -m compileall api`
- `cd dashboard && npm run build`
- Optional: `cd dashboard && npm run lint` (if configured)
- Manual: `docker compose up`, create connector, ingest sample CSPM + Defender payloads, open `/attack-paths` and one detail page.

---

## 7. Rollback plan

- Revert offending Git commit(s).
- If DB migration applied: restore DB backup or drop new tables only if no production data depends on them.
- Feature flag (optional): env `OPENCNAPP_ATTACK_PATHS_V2=0` to serve old graph endpoint — only if needed during transition.

---

## 8. Deliverables checklist

- [ ] Connector multi-method backend + wizard UI
- [ ] `attack_paths` / `attack_path_edges` schema + SQLAlchemy models
- [ ] Attack path builder + ingest hook
- [ ] Attack paths REST API (list, detail, graph, asset, rebuild)
- [ ] Dashboard: list, detail, flow graph, node panel, story/timeline
- [ ] Native ingest adapters (Defender, Security Hub minimum)
- [ ] Tests + evidence log below
- [ ] Architecture SVG committed at `docs/execplans/cspm_attack_path_architecture.svg`

---

## 9. Evidence log (fill during execution)

| Command | Result | Notes |
|---------|--------|--------|
| | | |

---

## 10. Cursor handoff — one-paragraph prompt

“Implement **docs/execplans/cspm-attack-paths.md** end-to-end: follow the architecture in **docs/execplans/cspm_attack_path_architecture.svg**, replace the heuristic **api/routes/attack_paths.py** graph with **persisted** attack paths, extend **cloud connectors** for multiple auth methods and **AddCloudWizard**, normalize **Defender/Security Hub** into **findings**, build **Orca-style** **AttackPaths** list + **AttackPathDetail** with horizontal **D3** flow and **node side panel**, and keep **all domains** eligible for path membership. Validate with unittest, compileall, and **npm run build**.”
