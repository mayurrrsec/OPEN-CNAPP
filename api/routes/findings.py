from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from api.auth import get_current_user
from api.database.session import get_db
from api.models import AttackPath, Finding
from api.schemas import FindingCreate

router = APIRouter(prefix="/findings", tags=["findings"], dependencies=[Depends(get_current_user)])


def _finding_to_dict(f: Finding) -> dict:
    out: dict = {}
    for c in Finding.__table__.columns:
        v = getattr(f, c.name)
        if hasattr(v, "isoformat"):
            v = v.isoformat()
        out[c.name] = v
    return out


def _attack_path_counts_for_ids(db: Session, ids: set[str]) -> dict[str, int]:
    if not ids:
        return {}
    counts = {i: 0 for i in ids}
    for ap in db.query(AttackPath).filter(AttackPath.status == "active"):
        for fid in ap.finding_ids or []:
            if fid in counts:
                counts[fid] += 1
    return counts


@router.get("")
def list_findings(
    db: Session = Depends(get_db),
    severity: str | None = None,
    domain: str | None = None,
    cloud_provider: str | None = None,
    status: str | None = None,
    tool: str | None = None,
    source: str | None = None,
    q: str | None = None,
    limit: int = 50,
    offset: int = 0,
    sort: str = "created_at",
    order: str = "desc",
):
    limit = max(1, min(int(limit or 50), 200))
    offset = max(0, int(offset or 0))

    query = db.query(Finding)
    if severity:
        query = query.filter(Finding.severity == severity.upper())
    if domain:
        query = query.filter(Finding.domain == domain)
    if cloud_provider:
        query = query.filter(Finding.cloud_provider == cloud_provider)
    if status:
        query = query.filter(Finding.status == status)
    if tool:
        query = query.filter(Finding.tool == tool)
    if source:
        query = query.filter(Finding.source == source.strip())
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Finding.title.ilike(like),
                Finding.resource_id.ilike(like),
                Finding.resource_name.ilike(like),
                Finding.check_id.ilike(like),
            )
        )

    total = query.with_entities(func.count(Finding.id)).scalar() or 0

    sort_map = {
        "created_at": Finding.created_at,
        "severity": Finding.severity,
        "domain": Finding.domain,
        "tool": Finding.tool,
        "source": Finding.source,
        "status": Finding.status,
        "cloud_provider": Finding.cloud_provider,
    }
    sort_col = sort_map.get(sort, Finding.created_at)
    order = (order or "desc").lower()
    query = query.order_by(sort_col.asc() if order == "asc" else sort_col.desc())

    items = query.offset(offset).limit(limit).all()
    id_set = {f.id for f in items}
    path_counts = _attack_path_counts_for_ids(db, id_set)
    out_items = []
    for f in items:
        d = _finding_to_dict(f)
        d["attack_path_count"] = path_counts.get(f.id, 0)
        out_items.append(d)
    return {"items": out_items, "total": total, "limit": limit, "offset": offset}


@router.get("/{finding_id}")
def get_finding(finding_id: str, db: Session = Depends(get_db)):
    finding = db.query(Finding).filter(Finding.id == finding_id).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    d = _finding_to_dict(finding)
    d["attack_path_count"] = _attack_path_counts_for_ids(db, {finding_id}).get(finding_id, 0)
    return d


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
