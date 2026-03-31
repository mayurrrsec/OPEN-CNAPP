from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from api.database.session import get_db
from api.models import Scan
from api.schemas import ScanTrigger
from api.workers.scanner_runner import run_scan

router = APIRouter(prefix="/scans", tags=["scans"])

@router.get("")
def list_scans(db: Session = Depends(get_db)):
    return db.query(Scan).order_by(Scan.created_at.desc()).limit(200).all()

@router.post("/trigger")
def trigger_scan(payload: ScanTrigger, db: Session = Depends(get_db)):
    scan = Scan(plugin=payload.plugin, connector=payload.connector, status="queued", started_at=datetime.utcnow())
    db.add(scan)
    db.commit()
    db.refresh(scan)
    run_scan.delay(scan.id, scan.plugin, scan.connector)
    return scan
