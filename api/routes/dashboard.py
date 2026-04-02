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
    high = db.query(func.count(Finding.id)).filter(Finding.severity == "HIGH").scalar() or 0
    medium = db.query(func.count(Finding.id)).filter(Finding.severity == "MEDIUM").scalar() or 0
    low = db.query(func.count(Finding.id)).filter(Finding.severity == "LOW").scalar() or 0

    severity_rows = (
        db.query(Finding.severity, func.count(Finding.id))
        .group_by(Finding.severity)
        .all()
    )
    severity_breakdown = [{"name": s or "UNKNOWN", "value": c} for s, c in severity_rows]

    domain_rows = (
        db.query(Finding.domain, func.count(Finding.id))
        .group_by(Finding.domain)
        .all()
    )
    domain_breakdown = [{"name": d or "unknown", "value": c} for d, c in domain_rows]

    cloud_rows = (
        db.query(Finding.cloud_provider, func.count(Finding.id))
        .group_by(Finding.cloud_provider)
        .all()
    )
    cloud_breakdown = [{"name": (c or "unknown").lower(), "value": n} for c, n in cloud_rows]

    now = datetime.utcnow()
    trend = []
    for i in range(6, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        count = db.query(func.count(Finding.id)).filter(Finding.created_at >= day_start, Finding.created_at < day_end).scalar() or 0
        trend.append({"day": day_start.strftime("%Y-%m-%d"), "findings": count})

    score = max(0, 100 - (critical * 3 + high * 2 + (open_ // 10)))

    top_critical = (
        db.query(Finding)
        .filter(Finding.severity.in_(["CRITICAL", "HIGH"]))
        .order_by(Finding.created_at.desc())
        .limit(10)
        .all()
    )

    def _finding_summary(f: Finding) -> dict:
        return {
            "id": f.id,
            "severity": f.severity,
            "domain": f.domain,
            "cloud_provider": f.cloud_provider,
            "title": f.title,
        }

    return {
        "total_findings": total,
        "open_findings": open_,
        "critical": critical,
        "high": high,
        "medium": medium,
        "low": low,
        "secure_score": score,
        "severity_breakdown": severity_breakdown,
        "domain_breakdown": domain_breakdown,
        "cloud_breakdown": cloud_breakdown,
        "trend": trend,
        "top_findings": [_finding_summary(f) for f in top_critical],
    }
