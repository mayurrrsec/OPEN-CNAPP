"""Build persisted attack paths from findings (heuristic v1 — not Threatmapper)."""

from __future__ import annotations

import os
import uuid
from typing import Any

from sqlalchemy.orm import Session

from api.models import AttackPath, AttackPathEdge, Connector, Finding

SEV_WEIGHT = {"CRITICAL": 10, "HIGH": 7, "MEDIUM": 4, "LOW": 2, "INFO": 1}

_EXPOSURE_TERMS = ("public", "internet", "exposed", "0.0.0.0", "open to", "world", "wide open")


def _risk_for_severity(sev: str | None) -> float:
    return float(SEV_WEIGHT.get((sev or "MEDIUM").upper(), 3))


def _impact_from_edge_risk(risk: float, path_len: int) -> float:
    exposure_mult = 1.2
    length_penalty = 1.0 / max(1, path_len)
    raw = risk * 3.0 * exposure_mult * length_penalty
    return min(99.0, max(1.0, raw))


def _connector_id_for_account(db: Session, account_id: str | None) -> str | None:
    if not account_id:
        return None
    row = db.query(Connector).filter(Connector.name == account_id.strip()).first()
    return row.id if row else None


def rebuild_all_attack_paths(db: Session) -> dict[str, int]:
    """
    Full rebuild: clear tables and repopulate from findings (limit 5000).
    Idempotent. Uses cloud→resource→check style aggregation (same spirit as legacy in-memory graph).
    """
    if os.getenv("OPENCNAPP_SKIP_ATTACK_PATH_REBUILD") == "1":
        return {"paths": 0, "edges": 0, "skipped": 1}

    db.query(AttackPathEdge).delete()
    db.query(AttackPath).delete()
    db.commit()

    findings = db.query(Finding).order_by(Finding.created_at.desc()).limit(5000).all()
    path_risk: dict[tuple[str, str], float] = {}
    edge_findings: dict[tuple[str, str], list[str]] = {}

    for f in findings:
        cloud = f.cloud_provider or "unknown-cloud"
        resource = f.resource_id or f.resource_name or "unknown-resource"
        check = f.check_id or (f.title[:40] if f.title else "unknown-check")
        risk = _risk_for_severity(f.severity)

        for pair in ((cloud, resource), (resource, check)):
            path_risk[pair] = path_risk.get(pair, 0.0) + risk
            edge_findings.setdefault(pair, []).append(f.id)

    sorted_edges = sorted(path_risk.items(), key=lambda x: -x[1])[:80]
    paths_created = 0
    edges_created = 0

    for (source, target), score in sorted_edges:
        if score < 2.0:
            continue
        fids = edge_findings.get((source, target), [])[:24]
        path_len = 2
        impact = _impact_from_edge_risk(score, path_len)
        prob = min(99.0, impact * 0.95)
        title_blob = f"{source} → {target}"
        title = title_blob if len(title_blob) <= 500 else title_blob[:497] + "…"
        low = next((x for x in findings if x.id == fids[0]), None) if fids else None
        account_id = low.account_id if low else None
        cloud_provider = low.cloud_provider if low else None
        exposed = False
        if low:
            blob = f"{low.title or ''} {low.description or ''}".lower()
            exposed = any(t in blob for t in _EXPOSURE_TERMS)

        ap = AttackPath(
            id=str(uuid.uuid4()),
            title=title,
            impact_score=impact,
            probability_score=prob,
            risk_score=impact,
            is_exposed_internet=exposed,
            exposure_type="public_facing" if exposed else "internal",
            path_length=path_len,
            source_resource_id=source[:2000] if source else None,
            target_resource_id=target[:2000] if target else None,
            is_crown_jewel=False,
            cloud_provider=cloud_provider,
            connector_id=_connector_id_for_account(db, account_id),
            account_id=account_id,
            finding_ids=fids,
            edge_ids=[],
            status="active",
        )
        db.add(ap)
        paths_created += 1

        e = AttackPathEdge(
            id=str(uuid.uuid4()),
            attack_path_id=ap.id,
            source_key=source[:500],
            target_key=target[:500],
            source_finding_id=fids[0] if fids else None,
            target_finding_id=fids[1] if len(fids) > 1 else None,
            source_resource_id=source[:2000] if source else None,
            target_resource_id=target[:2000] if target else None,
            edge_type="aggregated",
            risk_weight=float(score),
        )
        db.add(e)
        edges_created += 1

    db.commit()
    return {"paths": paths_created, "edges": edges_created, "skipped": 0}


def path_to_graph_payload(path: AttackPath, db: Session) -> dict[str, Any]:
    """D3-friendly horizontal flow: Internet → source → target (+ alert cards from findings)."""
    findings = (
        db.query(Finding).filter(Finding.id.in_(path.finding_ids or [])).limit(50).all()
        if path.finding_ids
        else []
    )
    nodes: list[dict[str, Any]] = []
    edges_out: list[dict[str, Any]] = []
    alert_cards: dict[str, list[dict[str, Any]]] = {}

    nodes.append(
        {
            "id": "internet",
            "type": "internet",
            "label": "Internet",
            "column": 0,
            "account": "",
        }
    )
    src_id = f"n-src-{path.id[:8]}"
    tgt_id = f"n-tgt-{path.id[:8]}"
    src_label = path.source_resource_id or "Source"
    tgt_label = path.target_resource_id or "Target"
    nodes.append(
        {
            "id": src_id,
            "type": "asset",
            "label": src_label[:200],
            "resource_id": (path.source_resource_id or "")[:2000],
            "column": 1,
            "account": path.account_id or "",
            "cloud_provider": path.cloud_provider or "",
        }
    )
    nodes.append(
        {
            "id": tgt_id,
            "type": "crown_jewel" if path.is_crown_jewel else "asset",
            "label": tgt_label[:200],
            "resource_id": (path.target_resource_id or "")[:2000],
            "column": 2,
            "account": path.account_id or "",
            "cloud_provider": path.cloud_provider or "",
        }
    )
    edges_out.append({"source": "internet", "target": src_id, "edge_type": "exposure"})
    edges_out.append({"source": src_id, "target": tgt_id, "edge_type": "lateral_movement"})

    for f in findings[:6]:
        parent = src_id
        card = {
            "finding_id": f.id,
            "title": (f.title or "")[:240],
            "severity": f.severity,
            "tool": f.tool,
            "domain": f.domain,
            "check_id": f.check_id,
        }
        alert_cards.setdefault(parent, []).append(card)

    return {"nodes": nodes, "edges": edges_out, "alert_cards": alert_cards}
