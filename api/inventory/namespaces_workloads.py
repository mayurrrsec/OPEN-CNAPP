"""Derive namespace and workload inventory from findings (until dedicated sync tables exist)."""

from __future__ import annotations

from sqlalchemy import desc, func, or_
from sqlalchemy.orm import Session

from api.inventory.helpers import cluster_label, findings_for_connector
from api.models import Connector, Finding

_K8S = ("kubernetes", "onprem")

_WORKLOAD_KINDS = frozenset(
    {
        "pod",
        "deployment",
        "daemonset",
        "statefulset",
        "job",
        "cronjob",
        "replicaset",
        "namespace",
        "replicationcontroller",
    }
)


def _get_cluster(db: Session, cluster_id: str | None) -> Connector | None:
    if not cluster_id:
        return None
    c = db.query(Connector).filter(Connector.id == cluster_id).first()
    if not c or (c.connector_type or "").lower() not in _K8S:
        return None
    return c


def list_namespaces_inventory(
    db: Session,
    *,
    cluster_id: str | None,
    search: str,
    page: int,
    limit: int,
) -> dict:
    c = _get_cluster(db, cluster_id)
    if not c:
        return {"total": 0, "page": max(1, page), "items": [], "cluster_name": None}

    fq = findings_for_connector(db, c).filter(Finding.namespace.isnot(None))
    if search and search.strip():
        fq = fq.filter(Finding.namespace.ilike(f"%{search.strip()}%"))

    q = (
        fq.with_entities(
            Finding.namespace,
            func.count(Finding.id).label("finding_count"),
            func.max(Finding.updated_at).label("last_seen"),
        )
        .group_by(Finding.namespace)
        .order_by(desc(func.count(Finding.id)))
    )
    rows = q.all()
    total = len(rows)
    start = (max(1, page) - 1) * limit
    slice_rows = rows[start : start + limit]
    settings = c.settings or {}
    cn = cluster_label(settings, c.name)

    return {
        "total": total,
        "page": max(1, page),
        "items": [
            {
                "namespace": r[0],
                "cluster_id": c.id,
                "cluster_name": cn,
                "findings": int(r[1] or 0),
                "last_seen": r[2].isoformat() if r[2] else None,
            }
            for r in slice_rows
        ],
    }


def list_workloads_inventory(
    db: Session,
    *,
    cluster_id: str | None,
    namespace: str | None,
    kind: str | None,
    search: str,
    page: int,
    limit: int,
) -> dict:
    c = _get_cluster(db, cluster_id)
    if not c:
        return {"total": 0, "page": max(1, page), "items": [], "cluster_name": None}

    fq = findings_for_connector(db, c).filter(
        Finding.resource_type.isnot(None),
        or_(Finding.namespace.isnot(None), Finding.resource_name.isnot(None)),
    )
    if namespace and namespace.strip():
        fq = fq.filter(Finding.namespace == namespace.strip())
    if kind and kind.lower() not in ("all", ""):
        fq = fq.filter(Finding.resource_type.ilike(f"%{kind.strip()}%"))
    if search and search.strip():
        term = f"%{search.strip()}%"
        fq = fq.filter(
            or_(
                Finding.resource_name.ilike(term),
                Finding.resource_id.ilike(term),
                Finding.namespace.ilike(term),
            )
        )

    q = (
        fq.with_entities(
            Finding.namespace,
            Finding.resource_type,
            Finding.resource_name,
            Finding.resource_id,
            func.count(Finding.id).label("finding_count"),
            func.max(Finding.updated_at).label("last_seen"),
        )
        .group_by(Finding.namespace, Finding.resource_type, Finding.resource_name, Finding.resource_id)
        .order_by(desc(func.count(Finding.id)))
    )
    rows = q.all()
    total = len(rows)
    start = (max(1, page) - 1) * limit
    slice_rows = rows[start : start + limit]
    settings = c.settings or {}
    cn = cluster_label(settings, c.name)

    return {
        "total": total,
        "page": max(1, page),
        "items": [
            {
                "name": r[2] or r[3] or "—",
                "kind": r[1] or "—",
                "namespace": r[0] or "—",
                "cluster_id": c.id,
                "cluster_name": cn,
                "findings": int(r[4] or 0),
                "last_seen": r[5].isoformat() if r[5] else None,
            }
            for r in slice_rows
        ],
    }
