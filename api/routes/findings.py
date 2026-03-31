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
    status: str | None = None,
):
    q = db.query(Finding)
    if severity:
        q = q.filter(Finding.severity == severity.upper())
    if domain:
        q = q.filter(Finding.domain == domain)
    if cloud_provider:
        q = q.filter(Finding.cloud_provider == cloud_provider)
    if status:
        q = q.filter(Finding.status == status)
    return q.order_by(Finding.created_at.desc()).limit(500).all()


@router.post("")
def create_finding(payload: FindingCreate, db: Session = Depends(get_db)):
    model = payload.model_dump()
    model["fingerprint"] = Finding.compute_fingerprint(
        model["tool"], model.get("check_id"), model.get("resource_id"), model["title"]
    )
    finding = Finding(**model)
    db.add(finding)
    db.commit()
    db.refresh(finding)
    return finding


@router.patch("/{finding_id}")
def update_finding(finding_id: str, status: str | None = None, assigned_to: str | None = None, ticket_ref: str | None = None, db: Session = Depends(get_db)):
    finding = db.query(Finding).filter(Finding.id == finding_id).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    if status:
        finding.status = status
    if assigned_to is not None:
        finding.assigned_to = assigned_to
    if ticket_ref is not None:
        finding.ticket_ref = ticket_ref
    db.commit()
    return {"ok": True}
