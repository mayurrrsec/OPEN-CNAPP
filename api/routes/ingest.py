from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.adapters.registry import get_adapter
from api.database.session import get_db
from api.models import Finding

router = APIRouter(prefix="/ingest", tags=["ingest"])


@router.post("/{tool}")
def ingest(tool: str, payload: dict, db: Session = Depends(get_db)):
    adapter = get_adapter(tool)
    if not adapter:
        raise HTTPException(status_code=404, detail=f"No adapter for tool '{tool}'")

    normalized = adapter.normalize(payload)
    created = 0
    for f in normalized:
        row = Finding(**f)
        db.add(row)
        created += 1

    db.commit()
    return {"ingested": created, "tool": tool}
