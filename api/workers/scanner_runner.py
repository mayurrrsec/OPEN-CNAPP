from datetime import datetime
from api.workers.celery_app import celery_app

@celery_app.task(name="scan.run")
def run_scan(scan_id: int, plugin: str, connector: str):
    return {
        "scan_id": scan_id,
        "plugin": plugin,
        "connector": connector,
        "status": "completed",
        "finished_at": datetime.utcnow().isoformat(),
    }
