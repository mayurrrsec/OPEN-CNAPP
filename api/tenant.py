import os

from sqlalchemy.orm import Session

from api.bootstrap import ensure_default_workspace
from api.models import Workspace


def resolve_tenant_id(db: Session) -> str:
    """
    Stable workspace tenant id for Helm `global.tenantId` and agent auth.

    `OPENCNAPP_TENANT_ID` overrides the DB when set (useful for multi-region or explicit ops).
    Otherwise uses the default workspace row (`workspaces.id`, a UUID), created at bootstrap.
    """
    override = (os.getenv("OPENCNAPP_TENANT_ID") or "").strip()
    if override:
        return override
    ws = db.query(Workspace).order_by(Workspace.created_at.asc()).first()
    if not ws:
        ensure_default_workspace(db)
        ws = db.query(Workspace).order_by(Workspace.created_at.asc()).first()
    if ws:
        return ws.id
    raise RuntimeError("Could not resolve workspace tenant id")
