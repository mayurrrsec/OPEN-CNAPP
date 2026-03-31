from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from api.database.session import Base, SessionLocal, engine
from api.plugin_engine import sync_plugins_to_db
from api.routes import findings, scans, ingest, webhooks, plugins, connectors, dashboard, compliance, reports, auth, attack_paths
from api.websocket import manager
from api.workers.scheduler import start_scheduler


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
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

for r in [findings, scans, ingest, webhooks, plugins, connectors, dashboard, compliance, reports, auth, attack_paths]:
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
