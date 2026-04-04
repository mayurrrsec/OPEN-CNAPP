# ExecPlan: Cloud IAM / RBAC graph (Orca-style dense panel graph)

This plan covers **identity and permission topology** for the **node detail panel** (and optional global exploration): roles → policies → resources, trust chains, and cloud RBAC analogs — **without** pretending scanner-only `findings` rows are sufficient.

**Related:** [cspm-attack-paths.md](./cspm-attack-paths.md) (attack path list + heuristic flow), [IMPLEMENTATION_STATUS.md](../IMPLEMENTATION_STATUS.md) (current parity vs commercial CNAPP).

---

## 1. Goal

Deliver a **persisted, queryable IAM/RBAC graph** per cloud connector that powers a **second graph** in the asset/node panel (mini **React Flow** or equivalent): principals, policies, and resources as nodes; attachment, trust, and effective-access-style relationships as edges. **Findings** remain **overlays** (severity, MITRE tags) on nodes/edges where IDs match.

**Completion criteria (MVP):**

1. **Schema** — `graph_nodes` and `graph_edges` (or equivalent) keyed by **`connector_id`**, **account / subscription / project scope**, and **stable resource identifier** (e.g. ARN).
2. **Sync** — A **worker job** can populate/refresh the graph for a connector (on schedule and/or after connector save), with **documented rate limits and backoff**.
3. **API** — `GET /graph/subgraph` (or namespaced under `/inventory` / `/connectors`) returns `{ nodes, edges, meta }` for a **focus resource** + **depth** for the panel.
4. **UI** — Attack path / asset **sheet** includes a **tab or section** “IAM / access graph” fed by that API; existing **findings list** stays as a **tab** or secondary panel.
5. **Docs** — Operational notes: **cost model**, **sync frequency**, and **which integration path** is enabled (direct APIs vs tool-mediated export).

**Stretch (not required for MVP closure):** Azure AD / Entra paths (**BloodHound**-class), multi-hop **“any principal”** abstractions, live **Access Analyzer**-grade proofs.

---

## 2. Scope

### In scope

- **Data model** for multi-cloud **identity / access** graph fragments (AWS IAM first; Azure RBAC + GCP IAM as phased additions using the same pattern).
- **Ingestion strategies** (pick one or combine per deployment):
  - **Direct cloud SDK reads** (IAM List/Get-style calls) with **throttling, pagination, incremental cursors**.
  - **Tool-mediated export**: **PMapper**, **Steampipe** SQL export, **Cartography** Neo4j export → **ETL** into `graph_*` tables.
  - **Partial static analysis** outputs (e.g. **Cloudsplaining**-style policy bundles) as **supplementary** edges/annotations, not the only source.
- **Worker**: Celery task `sync_iam_graph(connector_name)` + scheduler hook (reuse patterns from `POST /inventory/sync-k8s-tables` / connector lifecycle).
- **API** + **dashboard** panel graph (React Flow recommended for hit-testing and layouts).
- **Explicit cost / quota strategy** (see §3).

### Out of scope (later phases)

- **Feature parity** with Orca’s full product (continuous risk scoring on every edge, automated remediation tickets).
- **BloodHound Enterprise**-grade AD attack paths as a **bundled** product feature (integration via **export ingest** is in scope as optional).
- **Replacing** existing **attack path builder** (`attack_paths` from findings); the two graphs **coexist** — IAM graph = structure, attack paths = risk narrative across findings.

---

## 3. Assumptions and constraints

### Environment

- Docker Compose / workers with **credentials** already on connectors (same as CSPM scans).
- Optional: **Neo4j** or extra containers **only if** Cartography or similar is chosen — heavier ops.

### Cost, quotas, and “is calling the cloud APIs expensive?”

- **AWS / Azure / GCP** — Most **read** APIs for IAM/RBAC inventory are **not billed per API call** like some data-plane services. The real **costs** are:
  - **Rate limits and throttling** (429s) → need **backoff, concurrency caps, incremental sync**.
  - **Worker CPU/time** and **DB size** for large orgs.
  - **Operational risk** of **wide IAM read** permissions (security review).
- **If the goal is to avoid hammering live APIs from OpenCNAPP core**, prefer:
  - **Scheduled, off-peak sync** (e.g. daily + manual “Refresh graph”).
  - **Tool-mediated batch** (Steampipe/PMapper runs **once**, output JSON → ingest) so the **control plane** does fewer raw calls per user click.
- **Steampipe / Cartography / Neo4j** — Cost is **your infra** (memory, CPU, disk), not a cloud API line item; Cartography adds **operational** cost.

**Constraint from product:** If **direct high-frequency API polling** is unacceptable, **default** the design to **batch export ingest** (Steampipe/PMapper/Cartography job output) + **lightweight delta** sync for critical connectors only.

### Security / compliance

- Store **only** what’s needed for the graph (ARNs, policy hashes, edge types); **no** secret values from policies in clear text if avoidable.
- Encrypt at rest consistent with connectors.

### External dependencies

- `boto3` / Azure SDK / GCP clients **or** containerized **Steampipe** / **Pmapper** CLI / **Cartography** sync job.
- **React Flow** (or **Cytoscape.js**) in the dashboard.

---

## 4. Design / approach

### 4.1 Conceptual model

- **Nodes** — `principal | policy | resource | identity_store | external` with `provider`, `kind`, `display_name`, `external_id` (ARN, fully qualified Azure resource ID, GCP self link).
- **Edges** — `ATTACHED | TRUSTS | ALLOWS_ACTION | MEMBER_OF | SCOPED_TO | ...` with optional **evidence** (policy version, statement index — stored as JSON, not full policy text by default).

### 4.2 Schema (illustrative)

```text
graph_nodes (
  id UUID PK,
  connector_id UUID FK connectors,
  cloud_account_id VARCHAR,  -- account id / subscription / project number
  provider VARCHAR,           -- aws | azure | gcp
  node_type VARCHAR,          -- iam_role | iam_policy | s3_bucket | ...
  external_id TEXT UNIQUE NOT NULL,  -- ARN or stable URI
  label TEXT,
  properties JSONB,
  last_seen TIMESTAMP
)

graph_edges (
  id UUID PK,
  connector_id UUID FK,
  source_node_id UUID FK graph_nodes,
  target_node_id UUID FK graph_nodes,
  edge_type VARCHAR,
  properties JSONB,
  last_seen TIMESTAMP
)

CREATE INDEX … ON graph_nodes (connector_id, external_id);
CREATE INDEX … ON graph_edges (connector_id, source_node_id);
CREATE INDEX … ON graph_edges (connector_id, target_node_id);
```

SQLite vs Postgres: use SQLAlchemy types compatible with existing `opencnapp.db` conventions; JSON as `JSON`.

### 4.3 Ingestion modes (choose per deployment)

| Mode | Pros | Cons |
|------|------|------|
| **A. Direct SDK sync** | Fresh, no extra tools | More API calls; must implement pagination/backoff per cloud |
| **B. Steampipe export** | Declarative SQL, one batch job | Requires Steampipe install + creds; ETL mapping |
| **C. PMapper output** | AWS privilege paths; aligns with existing `pmapper` adapter | AWS-centric; map output → generic graph |
| **D. Cartography → Neo4j export** | Rich multi-cloud graph | Extra service; sync from Neo4j → OpenCNAPP |
| **E. Cloudsplaining / policy JSON** | Deep policy insight | Usually supplementary, not full topology |

**Recommendation for MVP:** **AWS first** — implement **(A) minimal IAM + S3 bucket policy sync** with strict rate limits **or** **(C) ingest PMapper JSON** into `graph_*` if batch is preferred.

### 4.4 API

- `GET /graph/subgraph?connector_id|connector_name=&resource_arn=&depth=3&max_nodes=200`
  - Returns `{ nodes: [...], edges: [...], truncated: bool }`.
- Optional: `POST /graph/sync/{connector_name}` — manual refresh (admin).

### 4.5 UI

- **Asset / attack-path node panel**: tabs **Overview | IAM graph | Findings** (or stack graph above findings).
- **React Flow** for pan/zoom/minimap; node types styled by `node_type`.

### 4.6 Overlays

- Join **findings** to nodes by `resource_id` / ARN match; show badge counts on graph nodes.

---

## 5. Step-by-step implementation plan

1. **Schema + models**
   - Add `api/models/graph_node.py`, `api/models/graph_edge.py` (or single module); register in `api/models/__init__.py`; extend `api/database/init.sql`; `Base.metadata.create_all` on deploy.
   - **Output:** empty tables creatable.

2. **IAM sync service (AWS MVP)**
   - `api/services/iam_graph_sync_aws.py`: list roles, attached policies, trust docs; create nodes/edges; **idempotent** upsert by `external_id`.
   - **Output:** sync fills DB for one test connector.

3. **Alternative ingest: PMapper / Steampipe JSON → graph ETL**
   - `api/services/iam_graph_etl_pmapper.py` (or generic `iam_graph_etl.py`) mapping file/JSON to nodes/edges.
   - **Output:** same tables populated without live IAM loop (for cost-sensitive installs).

4. **Celery task + hooks**
   - `api/workers/iam_graph_sync.py`: `sync_iam_graph_task(connector_name)`; call from **connector PATCH/POST** (debounced) + **APScheduler** daily.
   - **Output:** automated refresh without user action.

5. **API route**
   - `api/routes/graph.py` — `GET /graph/subgraph`, `POST /graph/sync/{name}`; wire in `api/main.py`.
   - **Output:** JSON for UI.

6. **Dashboard**
   - `dashboard/src/components/graph/IamAccessGraphFlow.tsx` (React Flow); wire **AttackPathDetail** / asset sheet.
   - **Output:** visible mini-graph in panel.

7. **Tests + docs**
   - Unit tests for ETL and subgraph builder; `docs/help/iam-graph.md` (ops: cost, sync frequency, modes A–E).
   - **Output:** CI green; operators know how to avoid API spam.

---

## 6. Validation plan

- `python -m unittest discover -s tests -p "test_*.py"`
- `python -m compileall api`
- `cd dashboard && npm run build`
- Manual: run `POST /graph/sync/{connector}` (or trigger worker), then `GET /graph/subgraph?...` and load panel in UI.

---

## 7. Rollback plan

- Revert Git commits introducing `graph_*` tables and routes.
- If migration applied: drop `graph_edges` then `graph_nodes` (no FK to findings required for rollback).
- Feature flag: `OPENCNAPP_IAM_GRAPH=0` to hide API routes and UI tab.

---

## 8. Deliverables checklist

- [x] `graph_nodes` / `graph_edges` schema + models (`api/models/iam_graph.py`, `api/database/init.sql`)
- [x] AWS sync **and** PMapper-style JSON ETL (`api/services/iam_graph_sync_aws.py`, `api/services/iam_graph_etl_pmapper.py`); **default:** **ingest-only**; live `POST /graph/sync` requires **`OPENCNAPP_IAM_LIVE_AWS_SYNC=1`**
- [x] Celery task `iam_graph.sync` (`api/workers/iam_graph_sync.py`); scheduler/connector hook deferred (optional)
- [x] `GET /graph/subgraph` + `POST /graph/sync/{name}` + `POST /graph/ingest/{name}`; routes gated by `OPENCNAPP_IAM_GRAPH=0`, `api/main.py`
- [x] React Flow panel + findings tab layout (`AttackPathDetail.tsx`, `IamAccessGraphFlow.tsx`)
- [x] Tests + `docs/help/iam-graph.md`
- [x] `IMPLEMENTATION_STATUS.md` updated (IAM graph row + parity)

---

## 9. Evidence log (fill during execution)

| Command | Result | Notes |
|---------|--------|-------|
| `python -m unittest discover -s tests -p "test_*.py"` | OK (14 tests) | Includes `tests/test_iam_graph.py` |
| `python -m compileall api -q` | OK | |
| `cd dashboard && npm run build` | OK | `@xyflow/react` added |
| | | |

---

## 10. Cursor handoff (one paragraph)

Implement **`docs/execplans/cloud-iam-rbac-graph.md`**: add **`graph_nodes` / `graph_edges`**, an **AWS IAM sync or PMapper JSON ETL** (cost-sensitive: prefer batch export if direct API sync is too heavy), **Celery `sync_iam_graph`**, **`GET /graph/subgraph`** for the node panel, and a **React Flow** “IAM / access graph” tab next to findings; document **API rate limits** and **Steampipe/Cartography** as optional integrations. Validate with **unittest**, **compileall**, and **npm run build**.
