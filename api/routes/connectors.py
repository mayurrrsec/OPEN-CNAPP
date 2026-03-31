import os
import time
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from api.connectors.aws import AwsConnector
from api.connectors.azure import AzureConnector
from api.connectors.gcp import GcpConnector
from api.connectors.kubernetes import KubernetesConnector
from api.connectors.onprem import OnpremConnector
from api.crypto import encrypt
from api.database.session import get_db
from api.models import Connector

router = APIRouter(prefix="/connectors", tags=["connectors"])

CONNECTOR_IMPLS = {
    "azure": AzureConnector,
    "aws": AwsConnector,
    "gcp": GcpConnector,
    "kubernetes": KubernetesConnector,
    "onprem": OnpremConnector,
}


class ConnectorUpsert(BaseModel):
    name: str
    display_name: str
    connector_type: str
    credentials: dict = {}
    settings: dict = {}


@router.get("")
def list_connectors(db: Session = Depends(get_db)):
    return db.query(Connector).order_by(Connector.name.asc()).all()


@router.post("")
def upsert_connector(payload: ConnectorUpsert, db: Session = Depends(get_db)):
    existing = db.query(Connector).filter(Connector.name == payload.name).first()
    encrypted_credentials = encrypt(str(payload.credentials)) if payload.credentials else None
    if existing:
        existing.display_name = payload.display_name
        existing.connector_type = payload.connector_type
        existing.encrypted_credentials = encrypted_credentials
        existing.settings = payload.settings
        db.commit()
        return existing

    connector = Connector(
        name=payload.name,
        display_name=payload.display_name,
        connector_type=payload.connector_type,
        encrypted_credentials=encrypted_credentials,
        settings=payload.settings,
    )
    db.add(connector)
    db.commit()
    db.refresh(connector)
    return connector


@router.post("/{name}/test")
def test_connector(name: str):
    if name not in CONNECTOR_IMPLS:
        raise HTTPException(status_code=404, detail="Connector implementation not found")
    result = CONNECTOR_IMPLS[name]().validate()
    return {"connector": name, **result}


def _require_token(header_token: str | None):
    expected = os.getenv("CONNECTOR_SHARED_TOKEN", "opencnapp")
    if header_token != expected:
        raise HTTPException(status_code=401, detail="Invalid connector token")


def _with_retry(fn, retries: int = 3, delay: float = 0.2):
    last = None
    for _ in range(retries):
        try:
            return fn()
        except Exception as exc:
            last = exc
            time.sleep(delay)
    raise HTTPException(status_code=502, detail=f"connector pull failed: {last}")


@router.post("/sonarqube/pull")
def sonarqube_pull(payload: dict, token: str | None = None):
    _require_token(token)
    return _with_retry(lambda: {"mode": "pull", "tool": "sonarqube", "issues": len(payload.get("issues", []))})


@router.post("/zap/pull")
def zap_pull(payload: dict, token: str | None = None):
    _require_token(token)
    return _with_retry(lambda: {"mode": "pull", "tool": "zap", "alerts": len(payload.get("alerts", []))})


@router.post("/snyk/pull")
def snyk_pull(payload: dict, token: str | None = None):
    _require_token(token)
    return _with_retry(lambda: {"mode": "pull", "tool": "snyk", "issues": len(payload.get("issues", []))})
