"""Batch ingest for agents using join token (Bearer ocn_…)."""

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from api.agent_auth import verify_join_token
from api.database.session import get_db
from api.ingest_service import ingest_tool_payload, prepare_ingest_body

router = APIRouter(prefix="/ingest/agent", tags=["agent-ingest"])


@router.post("/{tool}")
def agent_ingest(
    tool: str,
    body: dict,
    db: Session = Depends(get_db),
    authorization: str | None = Header(None),
):
    """
    Same payload shapes as `POST /ingest/{tool}`, but requires
    `Authorization: Bearer <join token from Settings → Agent join tokens>`.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = authorization.split(None, 1)[1].strip()
    if not verify_join_token(db, token):
        raise HTTPException(status_code=401, detail="Invalid join token")

    payload, meta_cid = prepare_ingest_body(body)
    try:
        return ingest_tool_payload(db, tool, payload, connector_id=meta_cid, scan_id=None)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
