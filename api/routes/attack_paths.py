from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.database.session import get_db
from api.models import Finding

router = APIRouter(prefix="/attack-paths", tags=["attack-paths"])
SEV_WEIGHT = {"CRITICAL": 10, "HIGH": 7, "MEDIUM": 4, "LOW": 2, "INFO": 1}


@router.get("")
def attack_paths(db: Session = Depends(get_db)):
    findings = db.query(Finding).limit(1000).all()
    nodes = {}
    edges = []
    path_risk = {}

    for f in findings:
        cloud = f.cloud_provider or "unknown-cloud"
        resource = f.resource_id or f.resource_name or "unknown-resource"
        check = f.check_id or f.title[:40]
        sev = (f.severity or "MEDIUM").upper()
        risk = SEV_WEIGHT.get(sev, 3)

        nodes[cloud] = {"id": cloud, "type": "cloud"}
        nodes[resource] = {"id": resource, "type": "resource", "severity": sev}
        nodes[check] = {"id": check, "type": "check", "severity": sev}

        c_r = (cloud, resource)
        r_k = (resource, check)
        path_risk[c_r] = path_risk.get(c_r, 0) + risk
        path_risk[r_k] = path_risk.get(r_k, 0) + risk

    for (source, target), score in path_risk.items():
        edges.append({"source": source, "target": target, "risk": score})

    top_paths = sorted(edges, key=lambda x: x["risk"], reverse=True)[:20]
    return {"nodes": list(nodes.values()), "edges": edges, "top_paths": top_paths}
