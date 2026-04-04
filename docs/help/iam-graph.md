# IAM / access graph (panel)

OpenCNAPP stores a **connector-scoped** identity and permission fragment in **`graph_nodes`** and **`graph_edges`**. The attack-path **asset sheet** can show a **React Flow** subgraph next to **findings**.

## Recommended: batch / export integrations (no live polling from OpenCNAPP)

**Default operation** is to **avoid** calling AWS IAM (or other cloud control planes) from OpenCNAPP on a schedule or on every UI action. Instead:

| Tool / pattern | Typical flow |
|----------------|----------------|
| **PMapper** | Run PMapper in your pipeline; map or script its output to `{ "nodes": [...], "edges": [...] }` → **`POST /graph/ingest/{connector}`**. |
| **Steampipe** | Query IAM / cloud tables on **your** schedule; export rows to JSON and map to the same node/edge shape → **`POST /graph/ingest`**. |
| **Cartography** | Sync to Neo4j (or export); extract nodes/edges and **ingest** — no need for OpenCNAPP to hit AWS directly. |
| **Other** | Any job that produces stable ARNs and relationships can populate **`graph_*`** via ingest. |

This keeps **API rate limits, throttling, and operational review** under **your** batch cadence (nightly, weekly, CI), not tied to dashboard clicks.

## Optional: live AWS IAM sync (opt-in)

Direct boto3 calls (`list_roles`, `list_attached_role_policies`, …) exist for **small accounts or development** only. They are **disabled by default**.

| Env | Effect |
|-----|--------|
| *(unset or `0`)* | **`POST /graph/sync/{connector}`** returns **403**; Celery **`iam_graph.sync`** returns `live_aws_sync_disabled`. Use **`POST /graph/ingest`** instead. |
| **`OPENCNAPP_IAM_LIVE_AWS_SYNC=1`** | Enables live IAM API sync for **`POST /graph/sync`** / **`iam_graph.sync`**. Still uses pagination, sleeps between calls, and caps role enumeration (see `api/services/iam_graph_sync_aws.py`). |

**Do not** schedule high-frequency Celery jobs against live IAM unless you have explicitly accepted quota and blast radius; prefer **ingest** for production.

## API

- **`GET /graph/subgraph?connector_id=…&resource_arn=…&depth=3&max_nodes=200`** — neighborhood around a focus **ARN** (stored as `external_id`).
- **`POST /graph/ingest/{connector_name}`** — replace rows from JSON body (**primary** path for production).
- **`POST /graph/sync/{connector_name}`** — live AWS IAM refresh (**only if** `OPENCNAPP_IAM_LIVE_AWS_SYNC=1`).

Authentication: same JWT as other dashboard APIs.

## Cost and quotas

- **Batch ingest** adds **no** cloud API load from OpenCNAPP; cost is your export pipeline + DB size.
- **Live sync** uses IAM control-plane reads (usually not per-call billed, but **throttling** and **permission scope** still matter). Keep it **off** unless you need it.

## Celery

Task **`iam_graph.sync`** calls the same code as **`POST /graph/sync`**; it **no-ops** with `live_aws_sync_disabled` unless **`OPENCNAPP_IAM_LIVE_AWS_SYNC=1`**. Prefer scheduling **ingest** jobs (your script POSTs JSON) instead of frequent **`iam_graph.sync`**.

## Feature flags

| Variable | Effect |
|----------|--------|
| **`OPENCNAPP_IAM_GRAPH=0`** | Omits **`/graph/*`** routes entirely (`api/main.py`). |
| **`OPENCNAPP_IAM_LIVE_AWS_SYNC=0`** *(default)* | Blocks live **`POST /graph/sync`** / **`iam_graph.sync`** IAM API usage. |
| **`VITE_IAM_GRAPH=0`** | Dashboard can hide the IAM tab (build-time). |

## Dashboard

Attack path detail: node sheet tabs **Findings** and **IAM graph** when the path has a **connector** and the node is not the synthetic **internet** node.

## Getting “real” IAM topology into the panel

| Goal | What exists today | What you typically add |
|------|-------------------|-------------------------|
| **AWS** — roles/policies in `graph_*` | Optional live sync: set **`OPENCNAPP_IAM_LIVE_AWS_SYNC=1`**, then **`POST /graph/sync/{connector}`** for an **aws** connector. | Or **batch-only**: export → **`POST /graph/ingest`** (preferred for production). |
| **Azure** — RBAC / Entra | No native sync service in-repo yet. | **Steampipe** / **ARM** export / custom script → map principal → role → scope to **`POST /graph/ingest`** using the same `external_id` shape as your findings’ resource IDs where possible. |
| **GCP** — IAM bindings | No native sync service in-repo yet. | **Steampipe** / **asset inventory** export → **`POST /graph/ingest`**. |
| **Focus resource must match** | **`GET /graph/subgraph`** looks up **`graph_nodes.external_id`** = the **resource id** you click (ARN, subscription resource id, etc.). | Ensure ingest uses the **same string** as `findings.resource_id` (or what the attack-path node passes) so the subgraph query finds a row. |

**Summary:** PMapper/Steampipe/Cartography do **not** auto-wire into the attack-path D3 flow; they populate **`graph_*`** via **`/graph/ingest`**. The **IAM graph** tab then calls **`/graph/subgraph`** for that resource.
