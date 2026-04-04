# Quickstart
1. Copy `.env.example` to `.env`.
2. Run `docker compose up --build`.
3. Open API docs at `http://localhost:8000/docs`.
4. Open dashboard at `http://localhost:3000`.
5. **Optional demo data** (no real cloud creds) — **use the same database as the running API**:
   - **Docker (recommended):** from the repo root, run  
     `docker compose exec api python scripts/seed_demo_data.py`  
     Add `--reset` to wipe and re-seed previous demo rows. This writes to **Postgres** inside Compose, not your host SQLite.
   - **Local API only:** with `PYTHONPATH` set to `.`, run `python scripts/seed_demo_data.py` (same `--reset` flag).  
   Creates **demo-aws**, **demo-azure**, **demo-gcp**, and **demo-k8s** connectors plus dummy findings (including a **`cluster.contains`** K8s check id) and rebuilds attack paths.
