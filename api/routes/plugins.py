from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from api.auth import get_current_user
from api.database.session import get_db
from api.models import Finding, Plugin
from api.plugin_engine import sync_plugins_to_db

router = APIRouter(prefix="/plugins", tags=["plugins"], dependencies=[Depends(get_current_user)])


@router.post("/sync")
def sync_plugins(db: Session = Depends(get_db)):
    count = sync_plugins_to_db(db)
    return {"synced": count}


@router.get("")
def list_plugins(db: Session = Depends(get_db)):
    """List plugins with ingest finding counts per tool name (when names align)."""
    plugins = db.query(Plugin).order_by(Plugin.name.asc()).all()
    counts = dict(db.query(Finding.tool, func.count(Finding.id)).group_by(Finding.tool).all())
    out: list[dict] = []
    for p in plugins:
        out.append(
            {
                "id": p.id,
                "name": p.name,
                "display_name": p.display_name,
                "domain": p.domain,
                "run_mode": p.run_mode,
                "normalizer": p.normalizer,
                "image": p.image,
                "schedule": p.schedule,
                "enabled": p.enabled,
                "config": p.config,
                "created_at": p.created_at.isoformat() if p.created_at else None,
                "updated_at": p.updated_at.isoformat() if p.updated_at else None,
                "finding_count": int(counts.get(p.name, 0)),
            }
        )
    return out


@router.patch("/{name}/enable")
def set_plugin_enabled(name: str, enabled: bool, db: Session = Depends(get_db)):
    plugin = db.query(Plugin).filter(Plugin.name == name).first()
    if not plugin:
        raise HTTPException(status_code=404, detail="Plugin not found")
    plugin.enabled = enabled
    db.commit()
    return {"name": name, "enabled": enabled}


@router.patch("/{name}/config")
def set_plugin_config(name: str, config: dict, db: Session = Depends(get_db)):
    plugin = db.query(Plugin).filter(Plugin.name == name).first()
    if not plugin:
        raise HTTPException(status_code=404, detail="Plugin not found")
    plugin.config = config
    db.commit()
    return {"name": name, "config": plugin.config}
