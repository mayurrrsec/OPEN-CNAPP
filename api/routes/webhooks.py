from fastapi import APIRouter

router = APIRouter(prefix="/webhook", tags=["webhooks"])

@router.post("/falco")
def falco_webhook(payload: dict):
    return {"received": True, "rule": payload.get("rule")}
