from fastapi import APIRouter
from pydantic import BaseModel

try:
    import apprise
except Exception:
    apprise = None

router = APIRouter(prefix="/alerts", tags=["alerts"])
RULES: list[dict] = []


class RuleInput(BaseModel):
    name: str
    min_severity: str = "HIGH"
    notifier_url: str | None = None
    enabled: bool = True


@router.get("/rules")
def list_rules():
    return RULES


@router.post("/rules")
def create_rule(payload: RuleInput):
    row = payload.model_dump()
    RULES.append(row)
    return row


@router.post("/test")
def test_rule(message: str = "OpenCNAPP alert test"):
    sent = 0
    for r in RULES:
        if not r.get("enabled") or not r.get("notifier_url"):
            continue
        if apprise:
            apobj = apprise.Apprise()
            apobj.add(r["notifier_url"])
            apobj.notify(title="OpenCNAPP Alert", body=message)
            sent += 1
    return {"tested_rules": len(RULES), "notifications_sent": sent}
