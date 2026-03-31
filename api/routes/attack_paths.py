from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.database.session import get_db
from api.models import Finding

router = APIRouter(prefix="/attack-paths", tags=["attack-paths"])


@router.get("")
def attack_paths(db: Session = Depends(get_db)):
    findings = db.query(Finding).limit(500).all()
    nodes = {}
    edges = []

    for f in findings:
        cloud = f.cloud_provider or "unknown-cloud"
        resource = f.resource_id or f.resource_name or "unknown-resource"
        check = f.check_id or f.title[:40]

        nodes[cloud] = {"id": cloud, "type": "cloud"}
        nodes[resource] = {"id": resource, "type": "resource", "severity": f.severity}
        nodes[check] = {"id": check, "type": "check", "severity": f.severity}

        edges.append({"source": cloud, "target": resource})
        edges.append({"source": resource, "target": check})

    return {"nodes": list(nodes.values()), "edges": edges}
