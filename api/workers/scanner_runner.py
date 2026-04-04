import json
import os
from datetime import datetime

try:
    import docker
except Exception:
    docker = None

from api.database.session import SessionLocal
from api.ingest_service import ingest_tool_payload
from api.models import Plugin, Scan
from api.workers.celery_app import celery_app

# Plugins that emit JSON on stdout suitable for the matching ingest adapter
_KSPM_JSON_PLUGINS = frozenset(
    {
        "kubescape",
        "kubebench",
        "kube-bench",
        "polaris",
        "kubehunter",
        "kube-hunter",
    }
)


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
        ingested = None
        if docker and plugin and plugin.image and os.path.exists("/var/run/docker.sock"):
            client = docker.from_env()
            cmd = (plugin.config or {}).get("command")
            env = {
                "CONNECTOR": connector,
                "PLUGIN": plugin_name,
            }
            volumes = None
            kube_host = os.getenv("OPENCNAPP_KUBECONFIG")
            if kube_host and os.path.isfile(kube_host):
                volumes = {kube_host: {"bind": "/kubeconfig", "mode": "ro"}}
                env["KUBECONFIG"] = "/kubeconfig"
            elif kube_host:
                env["KUBECONFIG"] = kube_host
            container = client.containers.run(
                image=plugin.image,
                command=cmd,
                remove=True,
                detach=False,
                environment=env,
                volumes=volumes,
            )
            if isinstance(container, (bytes, bytearray)):
                output["stdout"] = container.decode(errors="ignore")
        else:
            output["stdout"] = "dry-run: docker unavailable or plugin image missing"

        connector_tag = connector if connector and connector != "auto" else None
        if (
            plugin_name in _KSPM_JSON_PLUGINS
            and output["stdout"].strip().startswith("{")
        ):
            try:
                data = json.loads(output["stdout"])
                ingested = ingest_tool_payload(
                    db,
                    plugin_name,
                    data,
                    connector_id=connector_tag,
                    scan_id=scan_id,
                )
                db.refresh(scan)
            except (json.JSONDecodeError, ValueError) as exc:
                scan.meta = {
                    **(scan.meta or {}),
                    "ingest_error": str(exc)[:500],
                    "output": output["stdout"][:2000],
                }
                db.commit()
                raise

        scan.status = "completed"
        scan.finished_at = datetime.utcnow()
        meta_out = {**(scan.meta or {}), "output_preview": output["stdout"][:1000]}
        if ingested:
            meta_out["ingest"] = ingested
        scan.meta = meta_out
        if ingested:
            scan.findings_count = ingested.get("ingested", 0)
        db.commit()
        return {"scan_id": scan_id, "status": scan.status, "ingest": ingested}
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
