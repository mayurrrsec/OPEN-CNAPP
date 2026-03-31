from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from api.database.session import Base, engine
from api.routes import findings, scans, ingest, webhooks, plugins, connectors, dashboard, compliance, reports
from api.websocket import manager

Base.metadata.create_all(bind=engine)

app = FastAPI(title="OpenCNAPP API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in [findings, scans, ingest, webhooks, plugins, connectors, dashboard, compliance, reports]:
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
