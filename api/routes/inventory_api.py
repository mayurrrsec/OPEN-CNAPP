from collections import defaultdict

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from api.auth import get_current_user
from api.database.session import get_db
from api.inventory.asset_categories import category_for_resource_type
from api.inventory.cluster_detail_service import cluster_info_from_findings, connection_status_from_findings
from api.inventory.helpers import cluster_label, domain_bucket, findings_for_connector
from api.inventory.namespaces_workloads import list_namespaces_inventory, list_workloads_inventory
from api.models import Connector, Finding

router = APIRouter(prefix="/inventory", tags=["inventory"], dependencies=[Depends(get_current_user)])

_CLOUD_TYPES = ("aws", "azure", "gcp")
_K8S_TYPES = ("kubernetes", "onprem")


@router.get("/assets")
def inventory_assets(
    db: Session = Depends(get_db),
    limit: int = 500,
    cloud_provider: str | None = None,
    group_by: str | None = Query(None, description="Optional: 'category' to group assets by heuristic category"),
):
    """Aggregated asset rows from findings (depth until a dedicated asset table exists)."""
    limit = max(1, min(int(limit or 500), 2000))
    q = (
        db.query(
            Finding.cloud_provider,
            Finding.account_id,
            Finding.resource_type,
            Finding.resource_id,
            Finding.resource_name,
            func.count(Finding.id).label("finding_count"),
            func.max(Finding.severity).label("max_severity"),
        )
        .group_by(
            Finding.cloud_provider,
            Finding.account_id,
            Finding.resource_type,
            Finding.resource_id,
            Finding.resource_name,
        )
    )
    if cloud_provider:
        q = q.filter(Finding.cloud_provider == cloud_provider)
    rows = q.order_by(func.count(Finding.id).desc()).limit(limit).all()

    asset_rows = [
        {
            "cloud_provider": r.cloud_provider,
            "account_id": r.account_id,
            "resource_type": r.resource_type,
            "resource_id": r.resource_id,
            "resource_name": r.resource_name,
            "finding_count": int(r.finding_count or 0),
            "max_severity": r.max_severity,
            "category": category_for_resource_type(r.resource_type),
        }
        for r in rows
    ]

    if group_by and str(group_by).lower() == "category":
        groups: dict[str, dict] = defaultdict(
            lambda: {
                "key": "",
                "label": "",
                "asset_count": 0,
                "total_findings": 0,
                "severity_breakdown": {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "INFO": 0},
                "assets": [],
            }
        )
        for a in asset_rows:
            cat = a["category"]
            g = groups[cat]
            g["key"] = cat
            g["label"] = cat
            g["asset_count"] += 1
            g["total_findings"] += a["finding_count"]
            sev = (a.get("max_severity") or "MEDIUM").upper()
            if sev in g["severity_breakdown"]:
                g["severity_breakdown"][sev] += a["finding_count"]
            g["assets"].append({k: v for k, v in a.items() if k != "category"})
        ranked = sorted(groups.values(), key=lambda x: -x["total_findings"])
        return {
            "group_by": "category",
            "total_groups": len(ranked),
            "total_assets": len(asset_rows),
            "groups": ranked,
        }

    return {
        "total_rows": len(asset_rows),
        "assets": asset_rows,
    }


@router.get("/clouds")
def list_cloud_accounts(db: Session = Depends(get_db)):
    """Configured CSPM cloud connectors."""
    rows = (
        db.query(Connector)
        .filter(Connector.connector_type.in_(_CLOUD_TYPES))
        .order_by(Connector.created_at.desc())
        .all()
    )
    return {
        "items": [
            {
                "id": c.id,
                "name": c.name,
                "display_name": c.display_name,
                "connector_type": c.connector_type,
                "enabled": c.enabled,
                "status": "active" if c.enabled else "disabled",
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in rows
        ],
        "total": len(rows),
    }


@router.get("/clusters")
def list_k8s_inventory_clusters(db: Session = Depends(get_db)):
    """Kubernetes / on-prem cluster connectors for Inventory table."""
    rows = (
        db.query(Connector)
        .filter(Connector.connector_type.in_(_K8S_TYPES))
        .order_by(Connector.created_at.desc())
        .all()
    )
    items = []
    for c in rows:
        fq = findings_for_connector(db, c)
        domain_counts = {"cis": 0, "kspm": 0, "img": 0, "sec": 0}
        for domain, cnt in fq.with_entities(Finding.domain, func.count(Finding.id)).group_by(Finding.domain).all():
            b = domain_bucket(domain)
            if b in domain_counts:
                domain_counts[b] += int(cnt or 0)
        settings = c.settings or {}
        cn = cluster_label(settings, c.name)
        info = cluster_info_from_findings(db, c)
        items.append(
            {
                "id": c.id,
                "name": c.name,
                "display_name": c.display_name,
                "cluster_name": cn,
                "cloud_type": settings.get("cloud_type") or settings.get("target") or "generic",
                "connection_status": connection_status_from_findings(db, c),
                "alerts_count": 0,
                "findings": domain_counts,
                "onboarded_at": c.created_at.isoformat() if c.created_at else None,
                "last_synced_at": None,
                "nodes": info["nodes"],
                "workloads": info["workloads"],
                "namespaces": info["namespaces"],
                "active_policies": info["active_policies"],
                "tags": info.get("tags") or [],
            }
        )
    return {"items": items, "total": len(items)}


@router.get("/namespaces")
def list_inventory_namespaces(
    db: Session = Depends(get_db),
    cluster_id: str | None = None,
    search: str = "",
    page: int = 1,
    limit: int = 25,
):
    """Namespace inventory derived from findings (until dedicated sync). Requires cluster_id."""
    return list_namespaces_inventory(db, cluster_id=cluster_id, search=search, page=page, limit=limit)


@router.get("/workloads")
def list_inventory_workloads(
    db: Session = Depends(get_db),
    cluster_id: str | None = None,
    namespace: str | None = None,
    kind: str | None = None,
    search: str = "",
    page: int = 1,
    limit: int = 25,
):
    """Workload inventory derived from grouped findings. Requires cluster_id."""
    return list_workloads_inventory(
        db,
        cluster_id=cluster_id,
        namespace=namespace,
        kind=kind,
        search=search,
        page=page,
        limit=limit,
    )


@router.get("/images")
def list_inventory_images(
    db: Session = Depends(get_db),
    cluster_id: str | None = None,
    limit: int = 100,
):
    """Container image rows derived from CVE/image findings."""
    limit = max(1, min(int(limit or 100), 500))
    if cluster_id:
        c = db.query(Connector).filter(Connector.id == cluster_id).first()
        if not c:
            return {"total": 0, "items": []}
        q = findings_for_connector(db, c).filter(Finding.cve_id.isnot(None))
    else:
        q = db.query(Finding).filter(Finding.cve_id.isnot(None))
    rows = q.order_by(Finding.updated_at.desc()).limit(limit).all()
    return {
        "total": len(rows),
        "items": [
            {
                "id": f.id,
                "image": (f.resource_name or f.resource_id or ""),
                "cve_id": f.cve_id,
                "severity": f.severity,
                "title": f.title,
                "last_seen": f.updated_at.isoformat() if f.updated_at else None,
            }
            for f in rows
        ],
    }


@router.post("/sync-k8s-tables")
def post_sync_k8s_tables(db: Session = Depends(get_db)):
    """Upsert k8s_clusters and k8s_nodes from current findings (no separate agent)."""
    from api.inventory.k8s_sync import sync_k8s_inventory_tables

    return sync_k8s_inventory_tables(db)


@router.get("/k8s-nodes")
def get_k8s_nodes(
    db: Session = Depends(get_db),
    cluster_id: str = Query(..., description="Kubernetes connector id"),
    limit: int = 500,
):
    """List materialized node names after sync (empty until POST /sync-k8s-tables)."""
    from api.inventory.k8s_sync import list_nodes_for_connector

    c = db.query(Connector).filter(Connector.id == cluster_id).first()
    if not c or (c.connector_type or "").lower() not in _K8S_TYPES:
        return {"total": 0, "items": []}
    items = list_nodes_for_connector(db, cluster_id, limit=limit)
    return {"total": len(items), "items": items}
