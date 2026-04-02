"""Cluster detail: finding-derived metrics, serialization, and query helpers."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import case, desc, distinct, func, or_
from sqlalchemy.orm import Session

from api.inventory.helpers import cluster_label, findings_for_connector, misconfiguration_query
from api.models import Connector, Finding
from api.models.k8s_cluster import K8sCluster

SEVERITY_ORDER = ("CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO")

_K8S_METRIC_HINTS: list[tuple[str, list[str]]] = [
    ("readiness_probe", ["readiness", "readinessprobe"]),
    ("liveness_probe", ["liveness", "livenessprobe"]),
    ("image_tag_not_latest", ["image tag", "latest tag", "imagetag", "tag is not"]),
    ("immutable_container_fs", ["immutable", "read only root", "readonlyrootfs"]),
    ("cpu_limits", ["cpu limit", "cpulimit", "cpu resource"]),
    ("memory_limits", ["memory limit", "mem limit", "memory resource"]),
    ("common_labels", ["common label", "recommended label", "app.kubernetes.io"]),
    ("cronjob", ["cronjob", "cron job"]),
    ("naked_pods", ["naked pod", "bare pod", "without controller"]),
]


def apply_severity_filter(q, severity: str):
    if not severity or str(severity).strip().lower() == "all":
        return q
    parts = [p.strip().upper() for p in str(severity).split(",") if p.strip()]
    if not parts:
        return q
    return q.filter(Finding.severity.in_(parts))


def connection_status_from_findings(db: Session, connector: Connector) -> str:
    fq = findings_for_connector(db, connector)
    latest = fq.order_by(Finding.created_at.desc()).first()
    if not latest or not latest.created_at:
        return "disconnected"
    now = datetime.utcnow()
    last = latest.created_at
    if getattr(last, "tzinfo", None) is not None:
        last = last.replace(tzinfo=None)
    age = now - last
    if age < timedelta(minutes=30):
        return "connected"
    if age < timedelta(hours=24):
        return "pending"
    return "disconnected"


def finding_to_dict(f: Finding) -> dict[str, Any]:
    return {
        "id": f.id,
        "severity": f.severity,
        "title": f.title,
        "description": f.description,
        "check_id": f.check_id,
        "resource_type": f.resource_type,
        "resource_name": f.resource_name,
        "resource_id": f.resource_id,
        "namespace": f.namespace,
        "domain": f.domain,
        "status": f.status,
        "tool": f.tool,
        "created_at": f.created_at.isoformat() if f.created_at else None,
    }


def _metric_key_for_finding(f: Finding) -> str | None:
    blob = f"{f.check_id or ''} {f.title or ''}".lower()
    for key, hints in _K8S_METRIC_HINTS:
        if any(h in blob for h in hints):
            return key
    return None


def k8s_resource_summary_counts(db: Session, connector: Connector, metric_keys: list[str]) -> dict[str, int]:
    fq = findings_for_connector(db, connector)
    counts = {k: 0 for k in metric_keys}
    for f in fq.all():
        mk = _metric_key_for_finding(f)
        if mk and mk in counts:
            counts[mk] += 1
    return counts


def findings_trend_for_connector(db: Session, connector: Connector, days: int = 14) -> list[dict[str, Any]]:
    mq = misconfiguration_query(db, connector)
    start = datetime.utcnow().date() - timedelta(days=days - 1)
    start_dt = datetime.combine(start, datetime.min.time())
    rows = (
        mq.filter(Finding.created_at >= start_dt)
        .with_entities(func.date(Finding.created_at).label("d"), func.count(Finding.id))
        .group_by(func.date(Finding.created_at))
        .all()
    )
    by_day = {str(r.d): int(r[1] or 0) for r in rows}
    out: list[dict[str, Any]] = []
    for i in range(days):
        d = start + timedelta(days=i)
        ds = d.isoformat()
        out.append({"date": ds, "count": int(by_day.get(ds, 0))})
    return out


def _inventory_counts_from_findings(db: Session, connector: Connector) -> dict[str, int]:
    """Nodes / workloads / namespace counts derived only from findings (used by sync + fallback)."""
    fq = findings_for_connector(db, connector)
    ns_set: set[str] = set()
    node_like = 0
    wl_like = 0
    wt = {"pod", "deployment", "daemonset", "statefulset", "replicaset", "job", "cronjob"}
    for f in fq.all():
        if f.namespace:
            ns_set.add(f.namespace)
        rt = (f.resource_type or "").lower()
        if "node" in rt:
            node_like += 1
        if rt in wt:
            wl_like += 1
    return {
        "nodes": node_like,
        "workloads": wl_like,
        "namespaces": len(ns_set),
    }


def cluster_info_from_findings(db: Session, connector: Connector) -> dict[str, Any]:
    settings = connector.settings or {}
    raw_tags = settings.get("tags")
    tags = raw_tags if isinstance(raw_tags, list) else []

    kc = db.query(K8sCluster).filter(K8sCluster.connector_id == connector.id).first()
    if kc and kc.synced_at is not None:
        inv = {
            "nodes": int(kc.nodes_count or 0),
            "workloads": int(kc.workloads_count or 0),
            "namespaces": int(kc.namespaces_count or 0),
        }
    else:
        inv = _inventory_counts_from_findings(db, connector)

    mq = misconfiguration_query(db, connector)
    policy_n = (
        db.query(func.count(distinct(Finding.check_id)))
        .select_from(Finding)
        .filter(
            Finding.id.in_(mq.filter(Finding.check_id.isnot(None)).with_entities(Finding.id).subquery())
        )
        .scalar()
    )

    return {
        "nodes": inv["nodes"],
        "workloads": inv["workloads"],
        "namespaces": inv["namespaces"],
        "active_policies": int(policy_n or 0),
        "tags": tags,
    }


def misconfig_insights(db: Session, connector: Connector) -> dict[str, Any]:
    mq = misconfiguration_query(db, connector)
    by_cat = (
        mq.with_entities(Finding.resource_type, func.count(Finding.id))
        .group_by(Finding.resource_type)
        .order_by(desc(func.count(Finding.id)))
        .limit(20)
        .all()
    )
    trend = findings_trend_for_connector(db, connector, days=14)
    return {
        "by_asset_category": [
            {"category": (r[0] or "unknown"), "count": int(r[1] or 0)} for r in by_cat
        ],
        "trend": trend,
    }


def paginated_misconfiguration_findings(
    db: Session,
    connector: Connector,
    *,
    severity: str,
    search: str,
    page: int,
    limit: int,
) -> tuple[int, list[dict[str, Any]]]:
    q = misconfiguration_query(db, connector)
    q = apply_severity_filter(q, severity)
    if search and search.strip():
        term = f"%{search.strip()}%"
        q = q.filter(
            or_(
                Finding.title.ilike(term),
                Finding.description.ilike(term),
                Finding.check_id.ilike(term),
                Finding.resource_name.ilike(term),
                Finding.resource_id.ilike(term),
            )
        )
    total = q.count()
    rows = (
        q.order_by(desc(Finding.created_at))
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return total, [finding_to_dict(f) for f in rows]


def paginated_policies_by_check(
    db: Session,
    connector: Connector,
    *,
    status: str,
    search: str,
    severity: str,
    page: int,
    limit: int,
) -> tuple[int, list[dict[str, Any]]]:
    def _policy_filtered_query():
        q = misconfiguration_query(db, connector).filter(Finding.check_id.isnot(None))
        if status and status.lower() != "all":
            q = q.filter(Finding.status == status)
        q = apply_severity_filter(q, severity)
        if search and search.strip():
            term = f"%{search.strip()}%"
            q = q.filter(or_(Finding.title.ilike(term), Finding.check_id.ilike(term)))
        return q

    base = _policy_filtered_query()
    ids_sq = base.with_entities(Finding.id).subquery()
    total = (
        db.query(func.count(distinct(Finding.check_id)))
        .select_from(Finding)
        .filter(Finding.id.in_(ids_sq))
        .scalar()
    )

    agg = (
        _policy_filtered_query()
        .with_entities(
            Finding.check_id,
            func.max(Finding.title).label("title"),
            func.count(Finding.id).label("finding_count"),
            func.sum(case((Finding.severity == "CRITICAL", 1), else_=0)).label("s_c"),
            func.sum(case((Finding.severity == "HIGH", 1), else_=0)).label("s_h"),
            func.sum(case((Finding.severity == "MEDIUM", 1), else_=0)).label("s_m"),
            func.sum(case((Finding.severity == "LOW", 1), else_=0)).label("s_l"),
            func.sum(case((Finding.severity == "INFO", 1), else_=0)).label("s_i"),
        )
        .group_by(Finding.check_id)
        .order_by(desc("finding_count"))
        .offset((page - 1) * limit)
        .limit(limit)
    )

    items: list[dict[str, Any]] = []
    for r in agg.all():
        cid = r[0]
        title = r[1]
        items.append(
            {
                "check_id": cid,
                "title": title,
                "failed_resources": int(r[2] or 0),
                "severity_breakdown": {
                    "CRITICAL": int(r[3] or 0),
                    "HIGH": int(r[4] or 0),
                    "MEDIUM": int(r[5] or 0),
                    "LOW": int(r[6] or 0),
                    "INFO": int(r[7] or 0),
                },
                "framework_refs": [],
            }
        )
    if items:
        cids = [i["check_id"] for i in items]
        refs: dict[str, list[Any]] = {}
        for f in (
            misconfiguration_query(db, connector)
            .filter(Finding.check_id.in_(cids))
            .with_entities(Finding.check_id, Finding.compliance)
            .all()
        ):
            cid, comp = f[0], f[1]
            if cid in refs:
                continue
            if isinstance(comp, list) and comp:
                refs[cid] = comp[:12]
            elif isinstance(comp, dict) and comp:
                refs[cid] = [{"key": k, "value": v} for k, v in list(comp.items())[:8]]
        for i in items:
            i["framework_refs"] = refs.get(i["check_id"], [])
    _enrich_policy_items_accuknox(db, connector, items)
    return int(total or 0), items


def _enrich_policy_items_accuknox(db: Session, connector: Connector, items: list[dict[str, Any]]) -> None:
    """Add AccuKnox-style policy row fields from findings + raw JSON."""
    for i in items:
        cid = i["check_id"]
        i["name"] = str(i.get("title") or cid)[:200]
        i["category"] = "hardening"
        sb = i.get("severity_breakdown") or {}
        i["alerts"] = int(sb.get("CRITICAL", 0) + sb.get("HIGH", 0))
        i["selector_labels"] = None
        i["tags"] = []
        ns_rows = (
            misconfiguration_query(db, connector)
            .filter(Finding.check_id == cid)
            .with_entities(Finding.namespace)
            .distinct()
            .all()
        )
        ns = sorted({n[0] for n in ns_rows if n[0]})
        if ns:
            shown = ns[:5]
            i["namespaces_display"] = ", ".join(shown)
            if len(ns) > 5:
                i["namespaces_display"] += f" (+{len(ns) - 5} more)"
        else:
            i["namespaces_display"] = None
        sample = (
            misconfiguration_query(db, connector)
            .filter(Finding.check_id == cid)
            .first()
        )
        if sample:
            raw = sample.raw if isinstance(sample.raw, dict) else {}
            sel = raw.get("selector") or raw.get("labels") or raw.get("matchLabels")
            if sel is not None:
                i["selector_labels"] = sel if isinstance(sel, str) else str(sel)[:160]
            if isinstance(raw.get("category"), str):
                i["category"] = raw["category"]
        refs = i.get("framework_refs") or []
        tags: list[str] = []
        for x in refs:
            if isinstance(x, str):
                tags.append(x)
            elif isinstance(x, dict):
                for k in ("name", "key", "framework", "controlID"):
                    if x.get(k):
                        tags.append(str(x[k]))
                        break
        i["tags"] = tags[:12]
        i["status"] = "failed" if i.get("failed_resources", 0) else "passed"


def paginated_cloud_asset_groups(
    db: Session,
    connector: Connector,
    *,
    severity: str,
    search: str,
    page: int,
    limit: int,
) -> tuple[int, list[dict[str, Any]]]:
    q = findings_for_connector(db, connector).filter(
        or_(
            Finding.cloud_provider.isnot(None),
            Finding.domain.in_(("cspm", "cis", "cis-k8s")),
        )
    )
    q = apply_severity_filter(q, severity)
    if search and search.strip():
        term = f"%{search.strip()}%"
        q = q.filter(
            or_(
                Finding.resource_type.ilike(term),
                Finding.resource_name.ilike(term),
                Finding.resource_id.ilike(term),
                Finding.account_id.ilike(term),
            )
        )

    groups: dict[tuple[str, str, str], dict[str, Any]] = {}
    for f in q.all():
        key = (
            f.resource_type or "unknown",
            (f.resource_id or "")[:500],
            (f.resource_name or "")[:500],
        )
        if key not in groups:
            groups[key] = {
                "resource_type": key[0],
                "resource_id": f.resource_id,
                "resource_name": f.resource_name,
                "cloud_provider": f.cloud_provider,
                "account_id": f.account_id,
                "severity_breakdown": {s: 0 for s in SEVERITY_ORDER},
                "total": 0,
            }
        g = groups[key]
        sev = (f.severity or "MEDIUM").upper()
        if sev in g["severity_breakdown"]:
            g["severity_breakdown"][sev] += 1
        g["total"] += 1

    ranked = sorted(groups.values(), key=lambda x: -x["total"])
    total = len(ranked)
    slice_ = ranked[(page - 1) * limit : page * limit]
    return total, slice_


# --- Vulnerabilities / Compliance / Alerts / App behaviour / KIEM (finding-derived) ---


def vulnerability_query(db: Session, connector: Connector):
    fq = findings_for_connector(db, connector)
    return fq.filter(
        or_(
            Finding.cve_id.isnot(None),
            Finding.domain.in_(("image-sec", "image_sec", "vuln", "cve")),
            Finding.tool.in_(("trivy", "trivy-operator", "snyk", "grype")),
        )
    )


def compliance_findings_query(db: Session, connector: Connector):
    return findings_for_connector(db, connector).filter(
        Finding.domain.in_(("compliance", "cis", "cis-k8s", "pci", "soc2", "hipaa", "gdpr"))
    )


def alerts_query(db: Session, connector: Connector):
    fq = findings_for_connector(db, connector)
    return fq.filter(
        or_(
            Finding.severity.in_(("CRITICAL", "HIGH")),
            Finding.tool.in_(("falco", "falco-operator", "kube-hunter")),
        )
    )


def app_behaviour_query(db: Session, connector: Connector):
    return findings_for_connector(db, connector).filter(
        or_(
            Finding.tool.in_(("falco", "falco-operator", "runtime")),
            Finding.domain.in_(("runtime", "behaviour", "behavior", "network")),
        )
    )


def kiem_query(db: Session, connector: Connector):
    fq = findings_for_connector(db, connector)
    return fq.filter(
        or_(
            Finding.domain.in_(("identity", "iam", "kiem", "rbac")),
            Finding.tool.in_(("kiem",)),
            Finding.title.ilike("%rbac%"),
            Finding.title.ilike("%service account%"),
        )
    )


def finding_to_dict_vuln(f: Finding) -> dict[str, Any]:
    d = finding_to_dict(f)
    d["cve_id"] = f.cve_id
    d["cvss_score"] = f.cvss_score
    return d


def finding_to_dict_compliance(f: Finding) -> dict[str, Any]:
    d = finding_to_dict(f)
    comp = f.compliance
    d["compliance"] = comp if isinstance(comp, (list, dict)) else []
    return d


def finding_to_dict_event(f: Finding) -> dict[str, Any]:
    d = finding_to_dict(f)
    d["event_type"] = f.domain or f.tool or "event"
    return d


def _apply_text_search(q, search: str):
    if not search or not search.strip():
        return q
    term = f"%{search.strip()}%"
    return q.filter(
        or_(
            Finding.title.ilike(term),
            Finding.description.ilike(term),
            Finding.check_id.ilike(term),
            Finding.resource_name.ilike(term),
            Finding.cve_id.ilike(term),
        )
    )


def paginated_query_findings(
    db: Session,
    connector: Connector,
    base_q,
    *,
    severity: str,
    search: str,
    page: int,
    limit: int,
    row_mapper,
) -> tuple[int, list[dict[str, Any]]]:
    q = apply_severity_filter(base_q, severity)
    q = _apply_text_search(q, search)
    total = q.count()
    rows = (
        q.order_by(desc(Finding.created_at))
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return total, [row_mapper(f) for f in rows]


def findings_trend_for_base_query(fq, days: int = 14) -> list[dict[str, Any]]:
    start = datetime.utcnow().date() - timedelta(days=days - 1)
    start_dt = datetime.combine(start, datetime.min.time())
    rows = (
        fq.filter(Finding.created_at >= start_dt)
        .with_entities(func.date(Finding.created_at).label("d"), func.count(Finding.id))
        .group_by(func.date(Finding.created_at))
        .all()
    )
    by_day = {str(r.d): int(r[1] or 0) for r in rows}
    out: list[dict[str, Any]] = []
    for i in range(days):
        d = start + timedelta(days=i)
        ds = d.isoformat()
        out.append({"date": ds, "count": int(by_day.get(ds, 0))})
    return out


def vulnerability_insights(db: Session, connector: Connector) -> dict[str, Any]:
    fq = vulnerability_query(db, connector)
    by_sev = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
    for sev, cnt in fq.with_entities(Finding.severity, func.count(Finding.id)).group_by(Finding.severity).all():
        k = (sev or "MEDIUM").upper()
        if k == "CRITICAL":
            by_sev["critical"] += int(cnt or 0)
        elif k == "HIGH":
            by_sev["high"] += int(cnt or 0)
        elif k == "MEDIUM":
            by_sev["medium"] += int(cnt or 0)
        elif k == "LOW":
            by_sev["low"] += int(cnt or 0)
        else:
            by_sev["info"] += int(cnt or 0)
    imgs = (
        fq.filter(Finding.resource_name.isnot(None))
        .with_entities(Finding.resource_name, func.count(Finding.id))
        .group_by(Finding.resource_name)
        .order_by(desc(func.count(Finding.id)))
        .limit(10)
        .all()
    )
    top_images = [{"image": r[0], "count": int(r[1] or 0)} for r in imgs]
    return {"top_images": top_images, "by_severity": by_sev}


def compliance_insights(db: Session, connector: Connector) -> dict[str, Any]:
    fq = compliance_findings_query(db, connector)
    by_domain = (
        fq.with_entities(Finding.domain, func.count(Finding.id))
        .group_by(Finding.domain)
        .order_by(desc(func.count(Finding.id)))
        .all()
    )
    by_framework = [
        {"framework": r[0] or "unknown", "count": int(r[1] or 0)} for r in by_domain
    ]
    trend = findings_trend_for_base_query(fq, days=14)
    return {"by_framework": by_framework, "trend": trend}


def alerts_insights(db: Session, connector: Connector) -> dict[str, Any]:
    fq = alerts_query(db, connector)
    by_sev = []
    for sev, cnt in (
        fq.with_entities(Finding.severity, func.count(Finding.id))
        .group_by(Finding.severity)
        .order_by(desc(func.count(Finding.id)))
        .all()
    ):
        by_sev.append({"severity": sev, "count": int(cnt or 0)})
    trend = findings_trend_for_base_query(fq, days=14)
    return {"by_severity": by_sev, "trend": trend}


def app_behaviour_insights(db: Session, connector: Connector) -> dict[str, Any]:
    fq = app_behaviour_query(db, connector)
    by_type = (
        fq.with_entities(Finding.tool, func.count(Finding.id))
        .group_by(Finding.tool)
        .order_by(desc(func.count(Finding.id)))
        .limit(15)
        .all()
    )
    trend = findings_trend_for_base_query(fq, days=14)
    return {
        "by_type": [{"type": r[0] or "unknown", "count": int(r[1] or 0)} for r in by_type],
        "trend": trend,
    }


def kiem_insights(db: Session, connector: Connector) -> dict[str, Any]:
    base = kiem_query(db, connector)
    by_cat = (
        base.with_entities(Finding.resource_type, func.count(Finding.id))
        .group_by(Finding.resource_type)
        .order_by(desc(func.count(Finding.id)))
        .limit(12)
        .all()
    )
    # Plan §4.8: weighted severities → score = 100 - min(weighted_sum, 100)
    weights = {"CRITICAL": 10.0, "HIGH": 5.0, "MEDIUM": 2.0, "LOW": 0.5, "INFO": 0.1}
    total_w = 0.0
    sev_q = kiem_query(db, connector)
    for sev, cnt in sev_q.with_entities(Finding.severity, func.count(Finding.id)).group_by(Finding.severity).all():
        w = weights.get((sev or "MEDIUM").upper(), 0.5)
        total_w += w * int(cnt or 0)
    risk_score = int(max(0, min(100, 100 - min(total_w, 100.0))))
    return {
        "risk_score": risk_score,
        "by_asset_type": [{"type": r[0] or "unknown", "count": int(r[1] or 0)} for r in by_cat],
    }
