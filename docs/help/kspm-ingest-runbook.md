# KSPM: ingest, scans, and worker kubeconfig

This runbook matches the backend behavior after **KSPM normalizers**, **`ingest_service`**, **`scanner_runner` JSON ingest**, and **agent join-token ingest** (`POST /ingest/agent/{tool}`).

## 1. Why inventory is empty

**Inventory → Clusters** only shows findings when rows exist in `findings` with **`account_id` = connector `name`** (or matching `resource_id` / `resource_name`). Use **`connector_id`** on ingest or in the wrapped body.

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

## 5. “Disconnected” cluster status

Status is derived from **recent findings** / activity. After successful ingest for that connector, refresh the cluster panel.

## 6. KSPM domain dashboard (`/dashboard/kspm`)

Placeholder tiles stay empty until **`GET /dashboard/summary?domain=kspm`** has data; wire extra widgets after ingest is stable.
