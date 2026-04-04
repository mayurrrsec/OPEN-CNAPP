# KSPM: ingest, scans, and worker kubeconfig

This runbook matches the backend behavior after **KSPM normalizers**, **`ingest_service`**, **`scanner_runner` JSON ingest**, and **agent join-token ingest** (`POST /ingest/agent/{tool}`).

## 1. Why inventory is empty

**Every ingest must tag the cluster** or cluster tabs stay empty: the API matches findings to a connector via `findings_for_connector` — **`Finding.account_id` = connector `name`** (slug), or matching `resource_id` / `resource_name` to the cluster label.

- **Required for manual/API ingest:** `POST /ingest/{tool}?connector_id=<connector-name>` **or** a wrapped body field **`connector_id`** (see below). Omitting it leaves `account_id` unset, so **no rows** match that connector.
- **Worker scans** set `account_id` from the `connector` field in the trigger payload when configured.

## 2. Ingest (manual or CI)

```http
POST /ingest/kubescape?connector_id=<connector-name>
Content-Type: application/json
```

Body = **raw** Kubescape JSON (`kubescape scan … --format json`).

Or wrapped:

```json
{
  "connector_id": "my-cluster",
  "data": { ... raw scanner JSON ... }
}
```

**Agent / Helm** (no user session cookie): same payload to **`POST /ingest/agent/kubescape`** with header:

```http
Authorization: Bearer ocn_<your join token>
```

## 3. Plugin manager + Celery worker

1. **Sync plugins** (picks up `config.command` from `plugins/*/plugin.yaml`): `POST /plugins/sync` (authenticated).
2. **Worker** must have **Docker socket** (default in Compose) and a **valid kubeconfig** for the target cluster:
   - Set **`OPENCNAPP_KUBECONFIG`** to the **host path** of the file inside the worker container (e.g. `/kubeconfig`).
   - Mount the file in **`docker-compose.yml`** under **worker** `volumes`, e.g. `C:\Users\you\.kube\config:/kubeconfig:ro` (adjust for Docker Desktop paths).
3. **Trigger scan**: `POST /scans/trigger` with `{ "plugin": "kubebench", "connector": "<connector-name>" }` (use the **slug** from Connectors, not `auto`).

The worker runs the plugin image, reads **JSON from stdout**, normalizes, and sets **`account_id`** from **`connector`**.

## 4. Images and commands

Defaults live in **`plugins/`**:

| Plugin      | Typical `config.command` (JSON on stdout) |
|-------------|---------------------------------------------|
| kubebench   | `["--json"]`                                |
| kubescape   | `["scan", "framework", "nsa", "--format", "json"]` |
| polaris     | `["audit", "--format", "json"]`           |
| kubehunter  | `["--report", "json"]` (active scan — non-prod) |

If a scanner fails or prints logs before `{`, adjust **`plugin.config`** via Plugin manager or YAML and **`POST /plugins/sync`**.

## 5. Connection status (UI)

Status uses the latest **attributed** finding’s timestamp (`findings_for_connector`):

| Status | Meaning |
|--------|---------|
| **connected** | Latest finding is newer than **30 minutes**. |
| **pending** | No findings yet **or** latest finding is **30 minutes to 24 hours** old (use `connector_id` on first ingest so rows attribute correctly). |
| **disconnected** | Latest finding is **older than 24 hours**. |

New connectors with **no** scans show **pending**, not disconnected.

## 6. `k8s_nodes` and the Overview tab

The **`k8s_nodes`** table is filled by **`POST /inventory/sync-k8s-tables`** (not by ingest alone). Until you run that sync for your connectors, the Overview tab may show **“No nodes reported yet”** even when findings exist — that is expected.

## 7. KSPM domain dashboard (`/dashboard/kspm`)

Tiles use **`GET /dashboard/summary?domain=kspm`** (includes `kspm_rollups` when data exists). Empty charts until findings are ingested with proper **`connector_id`** / **`account_id`** tagging.
