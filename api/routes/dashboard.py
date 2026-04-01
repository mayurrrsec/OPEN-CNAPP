from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from api.database.session import get_db
from api.models import Finding

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
def summary(db: Session = Depends(get_db)):
    total = db.query(func.count(Finding.id)).scalar() or 0
    open_ = db.query(func.count(Finding.id)).filter(Finding.status == "open").scalar() or 0
    critical = db.query(func.count(Finding.id)).filter(Finding.severity == "CRITICAL").scalar() or 0

    severity_rows = db.query(Finding.severity, func.count(Finding.id)).group_by(Finding.severity).all()
    severity_breakdown = [{"name": s or "UNKNOWN", "value": c} for s, c in severity_rows]

    domain_rows = db.query(Finding.domain, func.count(Finding.id)).group_by(Finding.domain).all()
    domain_breakdown = [{"name": d or "unknown", "value": c} for d, c in domain_rows]

    source_rows = db.query(Finding.source, func.count(Finding.id)).group_by(Finding.source).all()
    source_breakdown = [{"name": s or "unknown", "value": c} for s, c in source_rows]

    domain_cards = []
    for domain in ["cspm", "cwpp", "ciem"]:
        count = db.query(func.count(Finding.id)).filter(Finding.domain == domain).scalar() or 0
        domain_cards.append({"domain": domain, "value": count})

    now = datetime.utcnow()
    trend = []
    for i in range(6, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        count = db.query(func.count(Finding.id)).filter(Finding.created_at >= day_start, Finding.created_at < day_end).scalar() or 0
        trend.append({"day": day_start.strftime("%Y-%m-%d"), "findings": count})

    score = max(0, 100 - (critical * 2 + open_ // 10))
    return {
        "total_findings": total,
        "open_findings": open_,
        "critical": critical,
        "secure_score": score,
        "severity_breakdown": severity_breakdown,
        "domain_breakdown": domain_breakdown,
        "source_breakdown": source_breakdown,
        "domain_cards": domain_cards,
        "trend": trend,
    }
