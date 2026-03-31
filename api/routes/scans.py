from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.auth import get_current_user
from api.database.session import get_db
from api.models import Scan, Plugin
from api.schemas import ScanTrigger
from api.workers.scanner_runner import run_scan

router = APIRouter(prefix="/scans", tags=["scans"])
ACTIVE_SCAN_PLUGINS = {"nuclei", "nmap", "nikto", "sslyze", "cloudfox"}


@router.get("")
def list_scans(db: Session = Depends(get_db), limit: int = 200):
    return db.query(Scan).order_by(Scan.created_at.desc()).limit(limit).all()


@router.post("/trigger")
def trigger_scan(payload: ScanTrigger, db: Session = Depends(get_db), user: str = Depends(get_current_user)):
    plugin = db.query(Plugin).filter(Plugin.name == payload.plugin, Plugin.enabled.is_(True)).first()
    if not plugin:
        raise HTTPException(status_code=404, detail="Enabled plugin not found")

    if payload.plugin in ACTIVE_SCAN_PLUGINS and not payload.confirm_active_scan:
        raise HTTPException(status_code=400, detail="Active scan requires confirm_active_scan=true")

    scan = Scan(
        plugin=payload.plugin,
        connector=payload.connector,
        status="queued",
        started_at=datetime.utcnow(),
        meta={"source": payload.source, "requested_by": user},
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)
    run_scan.delay(scan.id, scan.plugin, scan.connector)
    return scan
