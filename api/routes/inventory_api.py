from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from api.auth import get_current_user
from api.database.session import get_db
from api.models import Finding

router = APIRouter(prefix="/inventory", tags=["inventory"], dependencies=[Depends(get_current_user)])


@router.get("/assets")
def inventory_assets(
    db: Session = Depends(get_db),
    limit: int = 500,
    cloud_provider: str | None = None,
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
    return {
        "total_rows": len(rows),
        "assets": [
            {
                "cloud_provider": r.cloud_provider,
                "account_id": r.account_id,
                "resource_type": r.resource_type,
                "resource_id": r.resource_id,
                "resource_name": r.resource_name,
                "finding_count": int(r.finding_count or 0),
                "max_severity": r.max_severity,
            }
            for r in rows
        ],
    }
