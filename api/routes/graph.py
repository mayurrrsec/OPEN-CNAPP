"""IAM / access graph API — subgraph query and sync."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from api.auth import get_current_user
from api.database.session import get_db
from api.models import Connector
from api.services.iam_graph_etl_pmapper import ingest_pmapper_style_json
from api.services.iam_graph_subgraph import build_subgraph
from api.services.iam_graph_sync_aws import sync_aws_iam_graph

router = APIRouter(prefix="/graph", tags=["graph"], dependencies=[Depends(get_current_user)])


def _resolve_connector(
    db: Session,
    *,
    connector_id: str | None,
    connector_name: str | None,
) -> Connector:
    if connector_id:
        c = db.query(Connector).filter(Connector.id == connector_id).first()
        if c:
            return c
    if connector_name:
        c = db.query(Connector).filter(Connector.name == connector_name).first()
        if c:
            return c
    raise HTTPException(status_code=404, detail="Connector not found")


@router.get("/subgraph")
def get_subgraph(
    resource_arn: str = Query(..., min_length=4),
    connector_id: str | None = Query(None),
    connector_name: str | None = Query(None),
    depth: int = Query(3, ge=0, le=10),
    max_nodes: int = Query(200, ge=5, le=500),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    if not connector_id and not connector_name:
        raise HTTPException(status_code=400, detail="Provide connector_id or connector_name")
    c = _resolve_connector(db, connector_id=connector_id, connector_name=connector_name)
    return build_subgraph(
        db,
        connector_id=c.id,
        resource_arn=resource_arn,
        depth=depth,
        max_nodes=max_nodes,
    )


@router.post("/sync/{connector_name}")
def post_sync_connector(
    connector_name: str,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    out = sync_aws_iam_graph(db, connector_name)
    if out.get("error") == "live_aws_sync_disabled":
        raise HTTPException(status_code=403, detail=out.get("message", "Live AWS IAM sync is disabled."))
    return out


class PmapperIngestBody(BaseModel):
    nodes: list[dict[str, Any]] = Field(default_factory=list)
    edges: list[dict[str, Any]] = Field(default_factory=list)


@router.post("/ingest/{connector_name}")
def post_ingest_pmapper(
    connector_name: str,
    body: PmapperIngestBody,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    return ingest_pmapper_style_json(db, connector_name, body.model_dump())
