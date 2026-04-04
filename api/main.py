from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from api.bootstrap import ensure_bootstrap_admin, ensure_default_workspace
from api.models.attack_path import AttackPath, AttackPathEdge  # noqa: F401 — register tables
from api.database.session import Base, SessionLocal, engine
from api.plugin_engine import sync_plugins_to_db
from api.routes import (
    agent_ingest,
    cluster_detail,
    agent_tokens,
    findings,
    scans,
    ingest,
    webhooks,
    plugins,
    connectors,
    dashboard,
    compliance,
    reports,
    auth,
    attack_paths,
    native_ingest,
    alerts,
    admin_users,
    search,
    inventory_api,
)
from api.websocket import manager
from api.workers.scheduler import start_scheduler


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        ensure_bootstrap_admin(db)
        ensure_default_workspace(db)
        sync_plugins_to_db(db)
    finally:
        db.close()
    start_scheduler()
    yield


app = FastAPI(title="OpenCNAPP API", version="0.2.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in [
    agent_ingest,
    cluster_detail,
    agent_tokens,
    findings,
    scans,
    ingest,
    webhooks,
    plugins,
    connectors,
    dashboard,
    compliance,
    reports,
    auth,
    attack_paths,
    native_ingest,
    alerts,
    admin_users,
    search,
    inventory_api,
]:
    app.include_router(r.router)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.websocket("/ws/alerts")
async def ws_alerts(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            await ws.receive_text()
    finally:
        manager.disconnect(ws)


@app.websocket("/ws/scan-progress")
async def ws_scan_progress(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            await ws.receive_text()
    finally:
        manager.disconnect(ws)
