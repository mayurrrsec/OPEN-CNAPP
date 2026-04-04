"""Natural-language steps for an attack path (Orca-style attack story)."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from api.models import AttackPath, Finding


def steps_for_path(db: Session, path: AttackPath) -> list[dict[str, Any]]:
    ids = path.finding_ids or []
    rows = db.query(Finding).filter(Finding.id.in_(ids)).order_by(Finding.created_at.asc()).limit(12).all()
    steps: list[dict[str, Any]] = []
    for i, f in enumerate(rows):
        acct = f.account_id or path.account_id or "account"
        steps.append(
            {
                "step": i + 1,
                "account": acct,
                "title": (f.title or "Finding")[:400],
                "text": (
                    f"{f.tool} ({f.domain}) reported {f.severity} for resource "
                    f"{f.resource_name or f.resource_id or 'resource'} — {f.title or 'issue'}."
                )[:800],
                "severity": f.severity,
                "tool": f.tool,
                "domain": f.domain,
            }
        )
    if not steps:
        steps.append(
            {
                "step": 1,
                "account": path.account_id or "",
                "title": "Aggregated path",
                "text": (
                    f"This path connects {path.source_resource_id or 'source'} to "
                    f"{path.target_resource_id or 'target'} (impact score {path.impact_score:.0f}). "
                    "Ingest more findings to attach detailed steps."
                ),
                "severity": "MEDIUM",
                "tool": "",
                "domain": "",
            }
        )
    return steps


def timeline_for_path(db: Session, path: AttackPath) -> list[dict[str, Any]]:
    ids = path.finding_ids or []
    rows = db.query(Finding).filter(Finding.id.in_(ids)).order_by(Finding.created_at.asc()).limit(20).all()
    out = []
    for f in rows:
        out.append(
            {
                "finding_id": f.id,
                "event": "finding_observed",
                "at": f.created_at.isoformat() if f.created_at else None,
                "title": (f.title or "")[:200],
            }
        )
    out.append(
        {
            "finding_id": None,
            "event": "path_computed",
            "at": path.updated_at.isoformat() if path.updated_at else None,
            "title": "Attack path record updated",
        }
    )
    return out
