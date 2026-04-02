from collections import defaultdict
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from api.auth import get_current_user
from api.database.session import get_db
from api.models import Finding
from api.routes.compliance import FRAMEWORKS

router = APIRouter(prefix="/dashboard", tags=["dashboard"], dependencies=[Depends(get_current_user)])

SEV_WEIGHT = {"CRITICAL": 10, "HIGH": 7, "MEDIUM": 4, "LOW": 2, "INFO": 1}


def _fq(db: Session, domain: str | None):
    q = db.query(Finding)
    if domain:
        q = q.filter(Finding.domain == domain.strip().lower())
    return q


def _attack_path_summary(findings: list[Finding]) -> dict:
    path_risk: dict[tuple[str, str], float] = {}
    for f in findings:
        cloud = f.cloud_provider or "unknown-cloud"
        resource = f.resource_id or f.resource_name or "unknown-resource"
        check = f.check_id or (f.title[:40] if f.title else "unknown-check")
        sev = (f.severity or "MEDIUM").upper()
        risk = float(SEV_WEIGHT.get(sev, 3))
        c_r = (cloud, resource)
        r_k = (resource, check)
        path_risk[c_r] = path_risk.get(c_r, 0.0) + risk
        path_risk[r_k] = path_risk.get(r_k, 0.0) + risk
    if not path_risk:
        return {"high_impact": 0, "medium_impact": 0, "low_impact": 0, "edge_count": 0}
    vals = list(path_risk.values())
    mx = max(vals) if vals else 1.0
    high = sum(1 for v in vals if v >= 0.66 * mx)
    med = sum(1 for v in vals if 0.33 * mx <= v < 0.66 * mx)
    low = sum(1 for v in vals if v < 0.33 * mx)
    return {"high_impact": high, "medium_impact": med, "low_impact": low, "edge_count": len(vals)}


@router.get("/summary")
def summary(
    db: Session = Depends(get_db),
    domain: str | None = Query(None, description="Filter rollups to findings.domain (e.g. cspm)"),
):
    fq = lambda: _fq(db, domain)

    total = fq().count()
    open_ = fq().filter(Finding.status == "open").count()
    critical = fq().filter(Finding.severity == "CRITICAL").count()
    high = fq().filter(Finding.severity == "HIGH").count()
    medium = fq().filter(Finding.severity == "MEDIUM").count()
    low = fq().filter(Finding.severity == "LOW").count()

    severity_rows = fq().with_entities(Finding.severity, func.count(Finding.id)).group_by(Finding.severity).all()
    severity_breakdown = [{"name": s or "UNKNOWN", "value": c} for s, c in severity_rows]

    domain_rows = fq().with_entities(Finding.domain, func.count(Finding.id)).group_by(Finding.domain).all()
    domain_breakdown = [{"name": d or "unknown", "value": c} for d, c in domain_rows]

    cloud_rows = fq().with_entities(Finding.cloud_provider, func.count(Finding.id)).group_by(Finding.cloud_provider).all()
    cloud_breakdown = [{"name": (c or "unknown").lower(), "value": n} for c, n in cloud_rows]

    pivot: dict[str, dict[str, int]] = defaultdict(
        lambda: {"provider": "", "total": 0, "critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
    )
    sev_rows = (
        fq()
        .with_entities(Finding.cloud_provider, Finding.severity, func.count(Finding.id))
        .group_by(Finding.cloud_provider, Finding.severity)
        .all()
    )
    for cloud, sev, cnt in sev_rows:
        key = (cloud or "unknown").lower()
        row = pivot[key]
        row["provider"] = key
        c = int(cnt)
        row["total"] += c
        u = (sev or "MEDIUM").upper()
        if u == "CRITICAL":
            row["critical"] += c
        elif u == "HIGH":
            row["high"] += c
        elif u == "MEDIUM":
            row["medium"] += c
        elif u == "LOW":
            row["low"] += c
        else:
            row["info"] += c
    findings_by_cloud = sorted(pivot.values(), key=lambda x: -x["total"])

    status_rows = fq().with_entities(Finding.status, func.count(Finding.id)).group_by(Finding.status).all()
    lifecycle_by_status = {str(s or "unknown"): int(c) for s, c in status_rows}

    now = datetime.utcnow()
    trend = []
    for i in range(6, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        count = fq().filter(Finding.created_at >= day_start, Finding.created_at < day_end).count()
        trend.append({"day": day_start.strftime("%Y-%m-%d"), "findings": count})

    score = max(0, 100 - (critical * 3 + high * 2 + max(0, open_ // 10)))
    if total == 0:
        label = "No data"
    elif score >= 80:
        label = "Good"
    elif score >= 50:
        label = "Fair"
    else:
        label = "Poor"

    domain_scores: dict[str, int] = {}
    for dname, _ in domain_rows:
        if not dname:
            continue
        sub = fq().filter(Finding.domain == dname).count()
        crit_d = fq().filter(Finding.domain == dname, Finding.severity == "CRITICAL").count()
        hi_d = fq().filter(Finding.domain == dname, Finding.severity == "HIGH").count()
        domain_scores[str(dname)] = max(0, 100 - (crit_d * 3 + hi_d * 2 + max(0, sub // 15)))

    top_critical = (
        fq()
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

    ap_findings = fq().limit(800).all()
    attack_path_summary = _attack_path_summary(list(ap_findings))

    fw_counts: dict[str, int] = {fw: 0 for fw in FRAMEWORKS}
    for f in fq().all():
        for raw in f.compliance or []:
            tag = str(raw).strip()
            for fw in FRAMEWORKS:
                if tag.upper().startswith(fw.upper()):
                    fw_counts[fw] = fw_counts.get(fw, 0) + 1
                    break

    compliance_overview = [
        {"framework": fw, "findings": fw_counts.get(fw, 0), "passed_pct": None} for fw in FRAMEWORKS
    ]

    return {
        "total_findings": total,
        "open_findings": open_,
        "critical": critical,
        "high": high,
        "medium": medium,
        "low": low,
        "secure_score": score,
        "risk_posture": {
            "score": score,
            "label": label,
            "delta_week": 0,
            "by_domain": domain_scores,
        },
        "severity_breakdown": severity_breakdown,
        "domain_breakdown": domain_breakdown,
        "cloud_breakdown": cloud_breakdown,
        "findings_by_cloud": findings_by_cloud,
        "lifecycle_by_status": lifecycle_by_status,
        "trend": trend,
        "top_findings": [_finding_summary(f) for f in top_critical],
        "attack_path_summary": attack_path_summary,
        "compliance_overview": compliance_overview,
        "domain_filter": domain,
    }
