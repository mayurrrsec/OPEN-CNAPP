"""Shared ingest persistence: connector tagging, finding key filtering, dedup."""

from __future__ import annotations

from sqlalchemy.orm import Session

from api.adapters.registry import get_adapter
from api.attack_path_builder import rebuild_all_attack_paths
from api.models import Finding

# SQLAlchemy column names we accept from normalized dicts (id/timestamps excluded)
_FINDING_KEYS = frozenset(
    c.name
    for c in Finding.__table__.columns
    if c.name not in ("id", "created_at", "updated_at")
)


def prepare_ingest_body(body: dict) -> tuple[dict, str | None]:
    """
    Split OpenCNAPP metadata from scanner JSON.

    Supported:
    - Wrapped: { "data": <scanner json>, "connector_id": "..." }
    - Top-level opencnapp_connector_id / connector_id (stripped before normalize)
    - _opencnapp / opencnapp: { "connector_id": "..." }
    """
    d = dict(body)
    cid = d.pop("opencnapp_connector_id", None) or d.pop("connector_id", None)
    meta = d.pop("_opencnapp", None) or d.pop("opencnapp", None)
    if isinstance(meta, dict) and meta.get("connector_id"):
        cid = cid or meta.get("connector_id")

    if isinstance(d.get("data"), dict):
        inner = d.pop("data")
        cid = cid or d.pop("connector_id", None) or d.pop("opencnapp_connector_id", None)
        return inner, cid

    return d, cid


def filter_finding_dict(f: dict) -> dict:
    out = {}
    for k, v in f.items():
        if k not in _FINDING_KEYS:
            continue
        if k == "compliance" and v is None:
            out[k] = []
        elif k == "raw" and not isinstance(v, dict):
            out[k] = {"value": v} if v is not None else {}
        else:
            out[k] = v
    return out


def persist_normalized_findings(
    db: Session,
    normalized: list[dict],
    *,
    connector_id: str | None = None,
    scan_id: str | None = None,
) -> tuple[int, int]:
    created = 0
    deduped = 0
    for f in normalized:
        fc = filter_finding_dict(f)
        if not fc.get("title"):
            continue
        if connector_id and not fc.get("account_id"):
            fc["account_id"] = connector_id
        if scan_id:
            fc["scan_id"] = scan_id
        fp = Finding.compute_fingerprint(
            fc["tool"], fc.get("check_id"), fc.get("resource_id"), fc["title"]
        )
        existing = (
            db.query(Finding)
            .filter(Finding.fingerprint == fp, Finding.status != "resolved")
            .first()
        )
        if existing:
            deduped += 1
            continue
        fc["fingerprint"] = fp
        db.add(Finding(**fc))
        created += 1
    db.commit()
    try:
        rebuild_all_attack_paths(db)
    except Exception:
        # Ingest must succeed even if path rebuild fails (e.g. empty DB edge case)
        pass
    return created, deduped


def ingest_tool_payload(
    db: Session,
    tool: str,
    payload: dict,
    *,
    connector_id: str | None = None,
    scan_id: str | None = None,
) -> dict:
    adapter = get_adapter(tool)
    if not adapter:
        raise ValueError(f"No adapter for tool '{tool}'")
    normalized = adapter.normalize(payload)
    created, deduped = persist_normalized_findings(
        db, normalized, connector_id=connector_id, scan_id=scan_id
    )
    return {"ingested": created, "deduped": deduped, "tool": tool}
