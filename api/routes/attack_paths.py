"""Attack paths API — persisted paths + D3 graph payloads."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from api.auth import get_current_user
from api.attack_path_builder import path_to_graph_payload, rebuild_all_attack_paths
from api.database.session import get_db
from api.models import AttackPath, Finding
from api.services.attack_story import steps_for_path, timeline_for_path

router = APIRouter(prefix="/attack-paths", tags=["attack-paths"], dependencies=[Depends(get_current_user)])


def _impact_band(score: float) -> str:
    s = float(score or 0)
    if s >= 70:
        return "HIGH"
    if s >= 40:
        return "MEDIUM"
    if s >= 1:
        return "LOW"
    return "INFORMATIONAL"


def _path_to_item(p: AttackPath) -> dict[str, Any]:
    return {
        "id": p.id,
        "title": p.title,
        "impact_score": p.impact_score,
        "probability_score": p.probability_score,
        "risk_score": p.risk_score,
        "impact_band": _impact_band(p.impact_score or 0),
        "path_length": p.path_length,
        "is_exposed_internet": p.is_exposed_internet,
        "exposure_type": p.exposure_type,
        "cloud_provider": p.cloud_provider,
        "account_id": p.account_id,
        "connector_id": p.connector_id,
        "source_resource_id": p.source_resource_id,
        "target_resource_id": p.target_resource_id,
        "finding_count": len(p.finding_ids or []),
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }


@router.post("/rebuild")
def rebuild_paths(db: Session = Depends(get_db)):
    """Recompute all attack paths from findings."""
    return rebuild_all_attack_paths(db)


@router.get("")
def list_attack_paths(
    db: Session = Depends(get_db),
    impact_band: str | None = Query(None, description="HIGH, MEDIUM, LOW, INFORMATIONAL"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    q = db.query(AttackPath).filter(AttackPath.status == "active")
    all_rows = q.all()
    summary = {"high": 0, "medium": 0, "low": 0, "informational": 0}
    for p in all_rows:
        b = _impact_band(p.impact_score or 0).lower()
        if b in summary:
            summary[b] += 1

    filtered = all_rows
    if impact_band:
        want = impact_band.strip().upper()
        filtered = [p for p in all_rows if _impact_band(p.impact_score or 0) == want]

    total = len(filtered)
    filtered.sort(key=lambda x: -(x.impact_score or 0))
    page = filtered[offset : offset + limit]

    return {
        "summary": {
            "by_impact": summary,
            "total_paths": len(all_rows),
        },
        "total": total,
        "items": [_path_to_item(p) for p in page],
        "offset": offset,
        "limit": limit,
    }


@router.get("/graph")
def attack_paths_graph_legacy(db: Session = Depends(get_db)):
    """Aggregate graph view from persisted paths (legacy widget compatibility)."""
    paths = db.query(AttackPath).order_by(AttackPath.impact_score.desc()).limit(100).all()
    nodes: list[dict[str, Any]] = []
    edges: list[dict[str, Any]] = []
    seen: set[str] = set()
    for p in paths:
        s = p.source_resource_id or ""
        t = p.target_resource_id or ""
        for x in (s, t):
            if x and x not in seen:
                seen.add(x)
                nodes.append({"id": x, "type": "resource"})
        if s and t:
            edges.append({"source": s, "target": t, "risk": float(p.impact_score or 0)})
    top_paths = [
        {
            "path_id": p.id,
            "source": p.source_resource_id,
            "target": p.target_resource_id,
            "risk": float(p.impact_score or 0),
        }
        for p in paths[:20]
    ]
    return {
        "nodes": nodes,
        "edges": edges,
        "top_paths": top_paths,
        "meta": {
            "node_count": len(nodes),
            "edge_count": len(edges),
            "description": "Derived from persisted attack_paths; prefer GET /attack-paths and /attack-paths/{id}/graph.",
        },
    }


@router.get("/assets")
def asset_attack_context(
    db: Session = Depends(get_db),
    resource_id: str = Query(..., min_length=1),
    connector_id: str | None = Query(None),
):
    """Side panel: findings and paths touching a resource id."""
    q = db.query(Finding).filter(Finding.resource_id == resource_id)
    if connector_id:
        q = q.filter(Finding.account_id == connector_id)
    findings = q.order_by(Finding.created_at.desc()).limit(100).all()
    paths = (
        db.query(AttackPath)
        .filter(
            or_(
                AttackPath.source_resource_id == resource_id,
                AttackPath.target_resource_id == resource_id,
            )
        )
        .limit(50)
        .all()
    )
    return {
        "resource_id": resource_id,
        "findings": [
            {
                "id": f.id,
                "title": f.title,
                "severity": f.severity,
                "tool": f.tool,
                "domain": f.domain,
                "created_at": f.created_at.isoformat() if f.created_at else None,
            }
            for f in findings
        ],
        "attack_paths": [_path_to_item(p) for p in paths],
    }


@router.get("/{path_id}/graph")
def attack_path_graph(path_id: str, db: Session = Depends(get_db)):
    p = db.query(AttackPath).filter(AttackPath.id == path_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Attack path not found")
    g = path_to_graph_payload(p, db)
    return {
        "path_id": path_id,
        **g,
        "meta": {
            "impact_score": p.impact_score,
            "title": p.title,
        },
    }


@router.get("/{path_id}")
def attack_path_detail(path_id: str, db: Session = Depends(get_db)):
    p = db.query(AttackPath).filter(AttackPath.id == path_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Attack path not found")
    return {
        "path": _path_to_item(p),
        "attack_story": steps_for_path(db, p),
        "timeline": timeline_for_path(db, p),
    }


@router.get("/story/{path_id}")
def attack_story_compat(path_id: str, db: Session = Depends(get_db)):
    """Backward-compatible story endpoint (returns steps in legacy shape when possible)."""
    p = db.query(AttackPath).filter(AttackPath.id == path_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Attack path not found")
    steps = steps_for_path(db, p)
    return {
        "path_id": p.id,
        "source": p.source_resource_id or "",
        "target": p.target_resource_id or "",
        "risk": float(p.risk_score or 0),
        "steps": [
            {
                "step": s["step"],
                "title": s.get("title", ""),
                "summary": s.get("text", ""),
                "severity": s.get("severity"),
                "tool": s.get("tool"),
                "domain": s.get("domain"),
            }
            for s in steps
        ],
    }

