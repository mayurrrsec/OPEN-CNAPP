from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session

from api.database.session import SessionLocal
from api.models import Plugin, Scan
from api.workers.scanner_runner import run_scan

scheduler = BackgroundScheduler()


def _queue_scheduled_scan(plugin_name: str):
    db = SessionLocal()
    try:
        scan = Scan(plugin=plugin_name, connector="auto", status="queued", started_at=datetime.utcnow(), meta={"source": "scheduled"})
        db.add(scan)
        db.commit()
        db.refresh(scan)
        run_scan.delay(scan.id, plugin_name, "auto")
    finally:
        db.close()


def configure_plugin_jobs(db: Session):
    scheduler.remove_all_jobs()
    plugins = db.query(Plugin).filter(Plugin.enabled.is_(True), Plugin.schedule.isnot(None)).all()
    for plugin in plugins:
        scheduler.add_job(
            _queue_scheduled_scan,
            trigger="cron",
            id=f"plugin-{plugin.name}",
            replace_existing=True,
            kwargs={"plugin_name": plugin.name},
            **_cron_kwargs(plugin.schedule),
        )


def _cron_kwargs(expr: str) -> dict:
    minute, hour, day, month, day_of_week = expr.split()
    return {"minute": minute, "hour": hour, "day": day, "month": month, "day_of_week": day_of_week}


def start_scheduler():
    if scheduler.running:
        return
    db = SessionLocal()
    try:
        configure_plugin_jobs(db)
    finally:
        db.close()
    scheduler.start()
