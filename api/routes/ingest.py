from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from api.database.session import get_db
from api.models import Finding

router = APIRouter(prefix="/ingest", tags=["ingest"])

@router.post("/{tool}")
def ingest(tool: str, payload: dict, db: Session = Depends(get_db)):
    created = 0
    for f in payload.get("findings", []):
        row = Finding(
            source=f.get("source", tool),
            tool=tool,
            title=f.get("title", "Untitled"),
            description=f.get("description"),
            severity=f.get("severity", "medium"),
            domain=f.get("domain", "unknown"),
            cloud=f.get("cloud", "unknown"),
            resource_id=f.get("resource_id", "unknown"),
            compliance=f.get("compliance", []),
            remediation=f.get("remediation"),
            raw=f,
            risk_score=float(f.get("risk_score", 0)),
        )
        db.add(row)
        created += 1
    db.commit()
    return {"ingested": created, "tool": tool}
