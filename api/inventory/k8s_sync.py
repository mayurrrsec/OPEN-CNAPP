"""Sync k8s_clusters / k8s_nodes from findings (no separate agent pipeline)."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy.orm import Session

from api.inventory.cluster_detail_service import _inventory_counts_from_findings
from api.inventory.helpers import findings_for_connector
from api.models import Connector
from api.models.k8s_cluster import K8sCluster
from api.models.k8s_node import K8sNode

_K8S = ("kubernetes", "onprem")


def _node_names_from_findings(db: Session, connector: Connector) -> set[str]:
    fq = findings_for_connector(db, connector)
    names: set[str] = set()
    for f in fq.all():
        if not f.resource_name:
            continue
        rt = (f.resource_type or "").lower()
        if "node" in rt:
            names.add(f.resource_name)
    return names


def sync_k8s_inventory_tables(db: Session) -> dict:
    """Upsert k8s_clusters and replace k8s_nodes for each K8s connector."""
    rows = db.query(Connector).filter(Connector.connector_type.in_(_K8S)).order_by(Connector.created_at.desc()).all()
    synced = 0
    nodes_written = 0
    now = datetime.utcnow()

    for c in rows:
        counts = _inventory_counts_from_findings(db, c)
        kc = db.query(K8sCluster).filter(K8sCluster.connector_id == c.id).first()
        if not kc:
            kc = K8sCluster(connector_id=c.id)
            db.add(kc)
        kc.nodes_count = counts["nodes"]
        kc.workloads_count = counts["workloads"]
        kc.namespaces_count = counts["namespaces"]
        kc.synced_at = now
        synced += 1

        db.query(K8sNode).filter(K8sNode.connector_id == c.id).delete()
        for name in _node_names_from_findings(db, c):
            db.add(K8sNode(id=str(uuid.uuid4()), connector_id=c.id, name=name, last_seen=now))
            nodes_written += 1

    db.commit()
    return {"synced_connectors": synced, "nodes_written": nodes_written}


def list_nodes_for_connector(db: Session, connector_id: str, limit: int = 500) -> list[dict]:
    limit = max(1, min(limit, 2000))
    rows = (
        db.query(K8sNode)
        .filter(K8sNode.connector_id == connector_id)
        .order_by(K8sNode.name.asc())
        .limit(limit)
        .all()
    )
    return [{"id": r.id, "name": r.name, "last_seen": r.last_seen.isoformat() if r.last_seen else None} for r in rows]
