# Attack paths

## How attack flow is built (not Threatmapper)

- **Attack flow graphs** are **computed in OpenCNAPP** from rows in **`findings`** (all domains: CSPM, KSPM, Defender, etc.). The service is **`api/attack_path_builder.py`**; it runs after ingest commits and can be triggered with **`POST /attack-paths/rebuild`**.
- **Threatmapper**, **Cartography**, and other tools are **optional scanners**: they only add findings through the normal **ingest** pipeline. They are **not** the graph engine.
- **Visualization** uses **D3** in the dashboard (`AttackFlowGraph.tsx`) with a **horizontal** layout fed by **`GET /attack-paths/{id}/graph`**.

## APIs

| Endpoint | Purpose |
|----------|---------|
| `GET /attack-paths` | List + impact summary |
| `GET /attack-paths/{id}` | Detail, attack story, timeline |
| `GET /attack-paths/{id}/graph` | Nodes/edges/alert cards for D3 |
| `GET /attack-paths/assets?resource_id=` | Side panel: findings for a resource |
| `POST /attack-paths/rebuild` | Recompute all paths |

## Environment

- Set `OPENCNAPP_SKIP_ATTACK_PATH_REBUILD=1` to skip rebuild after ingest (e.g. bulk tests).
