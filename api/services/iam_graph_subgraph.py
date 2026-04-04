"""BFS subgraph around a focus resource for the IAM graph panel."""

from __future__ import annotations

from sqlalchemy.orm import Session

from api.models.iam_graph import GraphEdge, GraphNode


def build_subgraph(
    db: Session,
    *,
    connector_id: str,
    resource_arn: str,
    depth: int = 3,
    max_nodes: int = 200,
) -> dict:
    focus = (
        db.query(GraphNode)
        .filter(GraphNode.connector_id == connector_id, GraphNode.external_id == resource_arn.strip())
        .first()
    )
    if not focus:
        return {
            "nodes": [],
            "edges": [],
            "truncated": False,
            "meta": {
                "message": (
                    "No graph data for this resource. Load data with POST /graph/ingest (PMapper / Steampipe / "
                    "Cartography export). Optional live AWS IAM sync: POST /graph/sync when "
                    "OPENCNAPP_IAM_LIVE_AWS_SYNC=1."
                ),
            },
        }

    depth = max(0, min(int(depth), 10))
    max_nodes = max(5, min(int(max_nodes), 500))

    visited: set[str] = {focus.id}
    current_level: set[str] = {focus.id}
    truncated = False

    for _ in range(depth):
        if len(visited) >= max_nodes:
            truncated = True
            break
        next_level: set[str] = set()
        for nid in current_level:
            q = (
                db.query(GraphEdge)
                .filter(GraphEdge.connector_id == connector_id)
                .filter((GraphEdge.source_node_id == nid) | (GraphEdge.target_node_id == nid))
            )
            for e in q:
                other = e.target_node_id if e.source_node_id == nid else e.source_node_id
                if other not in visited:
                    if len(visited) >= max_nodes:
                        truncated = True
                        break
                    visited.add(other)
                    next_level.add(other)
            if truncated:
                break
        current_level = next_level
        if not current_level:
            break

    nodes = db.query(GraphNode).filter(GraphNode.id.in_(visited)).all()
    edges = (
        db.query(GraphEdge)
        .filter(GraphEdge.connector_id == connector_id)
        .filter(GraphEdge.source_node_id.in_(visited))
        .filter(GraphEdge.target_node_id.in_(visited))
        .all()
    )

    return {
        "nodes": [_node_dict(n) for n in nodes],
        "edges": [_edge_dict(e) for e in edges],
        "truncated": truncated,
        "meta": {
            "focus_id": focus.id,
            "node_count": len(nodes),
            "edge_count": len(edges),
        },
    }


def _node_dict(n: GraphNode) -> dict:
    return {
        "id": n.id,
        "connector_id": n.connector_id,
        "cloud_account_id": n.cloud_account_id,
        "provider": n.provider,
        "node_type": n.node_type,
        "external_id": n.external_id,
        "label": n.label or n.external_id,
        "properties": n.properties or {},
    }


def _edge_dict(e: GraphEdge) -> dict:
    return {
        "id": e.id,
        "source": e.source_node_id,
        "target": e.target_node_id,
        "edge_type": e.edge_type,
        "properties": e.properties or {},
    }
