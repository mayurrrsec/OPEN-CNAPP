from datetime import datetime

from api.database.session import SessionLocal
from api.models import Scan
from api.workers.celery_app import celery_app


@celery_app.task(name="scan.run")
def run_scan(scan_id: str, plugin: str, connector: str):
    db = SessionLocal()
    try:
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        if not scan:
            return {"error": "scan_not_found", "scan_id": scan_id}
        scan.status = "running"
        scan.started_at = scan.started_at or datetime.utcnow()
        db.commit()

        # Placeholder runner: in real mode this launches scanner container.
        scan.status = "completed"
        scan.finished_at = datetime.utcnow()
        scan.findings_count = 0
        db.commit()
        return {
            "scan_id": scan_id,
            "plugin": plugin,
            "connector": connector,
            "status": "completed",
            "finished_at": scan.finished_at.isoformat(),
        }
    except Exception as exc:
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        if scan:
            scan.status = "failed"
            scan.error_message = str(exc)
            scan.finished_at = datetime.utcnow()
            db.commit()
        raise
    finally:
        db.close()
