from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.database.session import get_db
from api.models import Finding
from api.schemas import FindingCreate

router = APIRouter(prefix="/findings", tags=["findings"])


@router.get("")
def list_findings(
    db: Session = Depends(get_db),
    severity: str | None = None,
    domain: str | None = None,
    cloud_provider: str | None = None,
):
    q = db.query(Finding)
    if severity:
        q = q.filter(Finding.severity == severity.upper())
    if domain:
        q = q.filter(Finding.domain == domain)
    if cloud_provider:
        q = q.filter(Finding.cloud_provider == cloud_provider)
    return q.order_by(Finding.created_at.desc()).limit(500).all()


@router.post("")
def create_finding(payload: FindingCreate, db: Session = Depends(get_db)):
    finding = Finding(**payload.model_dump())
    db.add(finding)
    db.commit()
    db.refresh(finding)
    return finding


@router.patch("/{finding_id}")
def update_finding_status(finding_id: str, status: str, db: Session = Depends(get_db)):
    finding = db.query(Finding).filter(Finding.id == finding_id).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    finding.status = status
    db.commit()
    return {"ok": True}
