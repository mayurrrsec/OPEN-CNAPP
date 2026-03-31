from fastapi import APIRouter

from api.websocket import manager

router = APIRouter(prefix="/webhook", tags=["webhooks"])


@router.post("/falco")
async def falco_webhook(payload: dict):
    await manager.broadcast({"source": "falco", "event": payload})
    return {"received": True, "rule": payload.get("rule")}
