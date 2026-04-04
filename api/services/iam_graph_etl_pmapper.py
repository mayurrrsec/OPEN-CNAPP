"""Load a generic node/edge JSON export into graph_* (PMapper-style or ad-hoc batch)."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from api.models import Connector
from api.models.iam_graph import GraphEdge, GraphNode


def ingest_pmapper_style_json(
    db: Session,
    connector_name: str,
    payload: dict[str, Any],
    *,
    provider: str = "aws",
) -> dict[str, Any]:
    """
    Expected shape (keys are flexible):
      nodes: [{ external_id, node_type, label?, cloud_account_id?, properties? }]
      edges: [{ source_external_id, target_external_id, edge_type, properties? }]
    Aliases: source/target instead of source_external_id/target_external_id; id for external_id.
    """
    row = db.query(Connector).filter(Connector.name == connector_name).first()
    if not row:
        return {"ok": False, "error": "connector_not_found", "connector": connector_name}

    raw_nodes = payload.get("nodes") or payload.get("Nodes") or []
    raw_edges = payload.get("edges") or payload.get("Edges") or []
    if not isinstance(raw_nodes, list) or not isinstance(raw_edges, list):
        return {"ok": False, "error": "invalid_payload", "message": "nodes and edges must be arrays"}

    db.query(GraphEdge).filter(GraphEdge.connector_id == row.id).delete()
    db.query(GraphNode).filter(GraphNode.connector_id == row.id).delete()
    db.commit()

    by_ext: dict[str, GraphNode] = {}

    for item in raw_nodes:
        if not isinstance(item, dict):
            continue
        ext = (item.get("external_id") or item.get("id") or item.get("arn") or "").strip()
        if not ext:
            continue
        n = GraphNode(
            connector_id=row.id,
            cloud_account_id=(item.get("cloud_account_id") or item.get("account_id") or "") or None,
            provider=str(item.get("provider") or provider),
            node_type=str(item.get("node_type") or item.get("type") or "unknown"),
            external_id=ext,
            label=(item.get("label") or item.get("name") or ext),
            properties=item.get("properties") if isinstance(item.get("properties"), dict) else {},
        )
        db.add(n)
        db.flush()
        by_ext[ext] = n

    edge_n = 0
    for item in raw_edges:
        if not isinstance(item, dict):
            continue
        s = (
            item.get("source_external_id")
            or item.get("source")
            or item.get("from")
            or item.get("src")
        )
        t = (
            item.get("target_external_id")
            or item.get("target")
            or item.get("to")
            or item.get("dst")
        )
        if not s or not t:
            continue
        s, t = str(s).strip(), str(t).strip()
        a = by_ext.get(s)
        b = by_ext.get(t)
        if not a or not b:
            continue
        et = str(item.get("edge_type") or item.get("type") or "RELATED")
        db.add(
            GraphEdge(
                connector_id=row.id,
                source_node_id=a.id,
                target_node_id=b.id,
                edge_type=et,
                properties=item.get("properties") if isinstance(item.get("properties"), dict) else {},
            )
        )
        edge_n += 1

    db.commit()
    return {
        "ok": True,
        "connector": connector_name,
        "connector_id": row.id,
        "nodes": len(by_ext),
        "edges": edge_n,
    }
