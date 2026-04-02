from fastapi import APIRouter, Depends
from sqlalchemy import or_
from sqlalchemy.orm import Session

from api.auth import get_current_user
from api.database.session import get_db
from api.models import Finding

router = APIRouter(prefix="/search", tags=["search"], dependencies=[Depends(get_current_user)])


@router.get("")
def global_search(
    q: str,
    db: Session = Depends(get_db),
    limit: int = 30,
):
    """Search findings and surface key fields for the command palette / global search UI."""
    limit = max(1, min(int(limit or 30), 100))
    term = (q or "").strip()
    if len(term) < 2:
        return {"query": term, "findings": [], "assets": []}

    like = f"%{term}%"
    findings = (
        db.query(Finding)
        .filter(
            or_(
                Finding.title.ilike(like),
                Finding.resource_id.ilike(like),
                Finding.resource_name.ilike(like),
                Finding.check_id.ilike(like),
                Finding.tool.ilike(like),
            )
        )
        .order_by(Finding.created_at.desc())
        .limit(limit)
        .all()
    )

    asset_keys: dict[tuple[str | None, str | None], dict] = {}
    for f in findings:
        key = (f.cloud_provider, f.resource_id or f.resource_name)
        if key not in asset_keys:
            asset_keys[key] = {
                "cloud_provider": f.cloud_provider,
                "resource_id": f.resource_id,
                "resource_name": f.resource_name,
                "resource_type": f.resource_type,
            }

    return {
        "query": term,
        "findings": [
            {
                "id": f.id,
                "title": f.title,
                "severity": f.severity,
                "domain": f.domain,
                "tool": f.tool,
                "cloud_provider": f.cloud_provider,
                "resource_id": f.resource_id,
            }
            for f in findings
        ],
        "assets": list(asset_keys.values())[:20],
    }
