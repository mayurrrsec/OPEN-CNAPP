from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from api.database.session import get_db
from api.ingest_service import ingest_tool_payload, prepare_ingest_body

router = APIRouter(prefix="/ingest", tags=["ingest"])


@router.post("/{tool}")
def ingest(
    tool: str,
    body: dict,
    db: Session = Depends(get_db),
    connector_id: str | None = Query(
        None,
        description="Kubernetes connector name (slug); sets Finding.account_id for inventory matching",
    ),
):
    """
    Ingest scanner JSON. Pass raw tool output as JSON body, or wrap with
    `{ "data": <raw>, "connector_id": "my-connector" }`.
    `connector_id` query param overrides wrapper metadata.
    """
    payload, meta_cid = prepare_ingest_body(body)
    cid = connector_id or meta_cid
    try:
        return ingest_tool_payload(db, tool, payload, connector_id=cid, scan_id=None)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
