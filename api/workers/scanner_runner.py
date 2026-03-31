import os
from datetime import datetime

try:
    import docker
except Exception:
    docker = None

from api.database.session import SessionLocal
from api.models import Plugin, Scan
from api.workers.celery_app import celery_app


@celery_app.task(name="scan.run")
def run_scan(scan_id: str, plugin_name: str, connector: str):
    db = SessionLocal()
    try:
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        if not scan:
            return {"error": "scan_not_found", "scan_id": scan_id}

        plugin = db.query(Plugin).filter(Plugin.name == plugin_name).first()
        scan.status = "running"
        scan.started_at = scan.started_at or datetime.utcnow()
        scan.meta = {**(scan.meta or {}), "runner": "docker"}
        db.commit()

        output = {"stdout": "", "stderr": ""}
        if docker and plugin and plugin.image and os.path.exists('/var/run/docker.sock'):
            client = docker.from_env()
            cmd = (plugin.config or {}).get("command")
            container = client.containers.run(
                image=plugin.image,
                command=cmd,
                remove=True,
                detach=False,
                environment={"CONNECTOR": connector, "PLUGIN": plugin_name},
            )
            if isinstance(container, (bytes, bytearray)):
                output["stdout"] = container.decode(errors="ignore")
        else:
            output["stdout"] = "dry-run: docker unavailable or plugin image missing"

        scan.status = "completed"
        scan.finished_at = datetime.utcnow()
        scan.meta = {**(scan.meta or {}), "output": output["stdout"][:1000]}
        db.commit()
        return {"scan_id": scan_id, "status": scan.status}
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
