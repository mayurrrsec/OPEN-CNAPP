import ast
import json
import os
import time
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from api.auth import get_current_user
from api.connectors.aws import AwsConnector
from api.connectors.azure import AzureConnector
from api.connectors.gcp import GcpConnector
from api.connectors.kubernetes import KubernetesConnector
from api.connectors.onprem import OnpremConnector
from api.connectors.registry import RegistryConnector
from api.crypto import decrypt, encrypt
from api.database.session import get_db
from api.models import Connector

router = APIRouter(prefix="/connectors", tags=["connectors"], dependencies=[Depends(get_current_user)])

CONNECTOR_IMPLS = {
    "azure": AzureConnector,
    "aws": AwsConnector,
    "gcp": GcpConnector,
    "kubernetes": KubernetesConnector,
    "onprem": OnpremConnector,
    "registry": RegistryConnector,
}


class ConnectorUpsert(BaseModel):
    name: str
    display_name: str
    connector_type: str
    credentials: dict = {}
    settings: dict = {}


class ConnectorTestPayload(BaseModel):
    """Test credentials/settings without persisting (Phase 2)."""

    connector_type: str
    credentials: dict = {}
    settings: dict = {}


class EnabledPatch(BaseModel):
    enabled: bool


class ConnectorPatch(BaseModel):
    """Partial update; omit fields to leave unchanged."""

    display_name: str | None = None
    settings: dict | None = None
    enabled: bool | None = None
    credentials: dict | None = None


def _connector_public(r: Connector) -> dict:
    return {
        "id": r.id,
        "name": r.name,
        "display_name": r.display_name,
        "connector_type": r.connector_type,
        "enabled": r.enabled,
        "settings": r.settings or {},
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
    }


@router.get("")
def list_connectors(db: Session = Depends(get_db)):
    rows = db.query(Connector).order_by(Connector.name.asc()).all()
    return [_connector_public(r) for r in rows]


@router.get("/{name}")
def get_connector(name: str, db: Session = Depends(get_db)):
    row = db.query(Connector).filter(Connector.name == name).first()
    if not row:
        raise HTTPException(status_code=404, detail="Connector not found")
    return _connector_public(row)


@router.delete("/{name}")
def delete_connector(name: str, db: Session = Depends(get_db)):
    row = db.query(Connector).filter(Connector.name == name).first()
    if not row:
        raise HTTPException(status_code=404, detail="Connector not found")
    db.delete(row)
    db.commit()
    return {"deleted": True, "name": name}


@router.patch("/{name}/enabled")
def patch_connector_enabled(name: str, payload: EnabledPatch, db: Session = Depends(get_db)):
    row = db.query(Connector).filter(Connector.name == name).first()
    if not row:
        raise HTTPException(status_code=404, detail="Connector not found")
    row.enabled = payload.enabled
    db.commit()
    db.refresh(row)
    return _connector_public(row)


@router.patch("/{name}")
def patch_connector(name: str, payload: ConnectorPatch, db: Session = Depends(get_db)):
    row = db.query(Connector).filter(Connector.name == name).first()
    if not row:
        raise HTTPException(status_code=404, detail="Connector not found")
    if payload.display_name is not None:
        row.display_name = payload.display_name
    if payload.settings is not None:
        row.settings = payload.settings
    if payload.enabled is not None:
        row.enabled = payload.enabled
    if payload.credentials is not None and payload.credentials:
        row.encrypted_credentials = encrypt(str(payload.credentials))
    db.commit()
    db.refresh(row)
    return _connector_public(row)


def _parse_credentials_blob(raw: str) -> dict:
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except Exception:
        pass
    try:
        return ast.literal_eval(raw)
    except Exception:
        return {}


@router.post("/test")
def test_connector_payload(payload: ConnectorTestPayload):
    """Validate credentials with provider SDKs where possible (STS, ARM, GCP CRM, registry HTTP)."""
    ct = (payload.connector_type or "").lower().strip()
    if ct not in CONNECTOR_IMPLS:
        raise HTTPException(status_code=404, detail="Connector implementation not found")
    impl = CONNECTOR_IMPLS[ct]()
    result = impl.test_credentials(payload.credentials or {}, payload.settings or {})
    out = {**result, "connector_type": ct}
    if "message" not in out and "ok" in out:
        out["message"] = "ok" if out.get("ok") else "validation failed"
    return out


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
        db.refresh(existing)
        return _connector_public(existing)

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
    return _connector_public(connector)


@router.post("/{name}/test")
def test_saved_connector(name: str, db: Session = Depends(get_db)):
    row = db.query(Connector).filter(Connector.name == name).first()
    if not row:
        raise HTTPException(status_code=404, detail="Connector not found")
    ct = (row.connector_type or "").lower().strip()
    if ct not in CONNECTOR_IMPLS:
        raise HTTPException(status_code=404, detail="Connector implementation not found")
    creds: dict = {}
    if row.encrypted_credentials:
        try:
            creds = _parse_credentials_blob(decrypt(row.encrypted_credentials))
            if not isinstance(creds, dict):
                creds = {}
        except Exception:
            creds = {}
    impl = CONNECTOR_IMPLS[ct]()
    result = impl.test_credentials(creds, row.settings or {})
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
