from fastapi import APIRouter

router = APIRouter(prefix="/connectors", tags=["connectors"])

CONNECTORS = [
    {"name": "azure", "display_name": "Azure"},
    {"name": "aws", "display_name": "AWS"},
    {"name": "gcp", "display_name": "GCP"},
    {"name": "kubernetes", "display_name": "Kubernetes"},
    {"name": "onprem", "display_name": "On-prem"},
]

@router.get("")
def list_connectors():
    return CONNECTORS

@router.post("/test")
def test_connector(name: str):
    return {"connector": name, "ok": True}
