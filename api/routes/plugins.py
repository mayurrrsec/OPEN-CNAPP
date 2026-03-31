from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.database.session import get_db
from api.models import Plugin
from api.plugin_engine import sync_plugins_to_db

router = APIRouter(prefix="/plugins", tags=["plugins"])


@router.post("/sync")
def sync_plugins(db: Session = Depends(get_db)):
    count = sync_plugins_to_db(db)
    return {"synced": count}


@router.get("")
def list_plugins(db: Session = Depends(get_db)):
    return db.query(Plugin).order_by(Plugin.name.asc()).all()


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
