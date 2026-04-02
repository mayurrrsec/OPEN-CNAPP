import hashlib

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.auth import get_current_user
from api.database.session import get_db
from api.models import Finding

router = APIRouter(prefix="/attack-paths", tags=["attack-paths"], dependencies=[Depends(get_current_user)])
SEV_WEIGHT = {"CRITICAL": 10, "HIGH": 7, "MEDIUM": 4, "LOW": 2, "INFO": 1}


def _path_id(source: str, target: str) -> str:
    return hashlib.sha256(f"{source}|{target}".encode()).hexdigest()


def _build_graph(db: Session):
    findings = db.query(Finding).limit(1000).all()
    nodes: dict[str, dict] = {}
    edges: list[dict] = []
    path_risk: dict[tuple[str, str], float] = {}

    for f in findings:
        cloud = f.cloud_provider or "unknown-cloud"
        resource = f.resource_id or f.resource_name or "unknown-resource"
        check = f.check_id or (f.title[:40] if f.title else "unknown-check")
        sev = (f.severity or "MEDIUM").upper()
        risk = float(SEV_WEIGHT.get(sev, 3))

        nodes[cloud] = {"id": cloud, "type": "cloud"}
        nodes[resource] = {"id": resource, "type": "resource", "severity": sev}
        nodes[check] = {"id": check, "type": "check", "severity": sev}

        c_r = (cloud, resource)
        r_k = (resource, check)
        path_risk[c_r] = path_risk.get(c_r, 0.0) + risk
        path_risk[r_k] = path_risk.get(r_k, 0.0) + risk

    for (source, target), score in path_risk.items():
        edges.append({"source": source, "target": target, "risk": score})

    top_paths = []
    for (source, target), score in sorted(path_risk.items(), key=lambda x: -x[1])[:20]:
        top_paths.append(
            {
                "path_id": _path_id(source, target),
                "source": source,
                "target": target,
                "risk": score,
            }
        )

    return {"nodes": list(nodes.values()), "edges": edges, "top_paths": top_paths, "findings": findings}


def _finding_on_edge(f: Finding, source: str, target: str) -> bool:
    cloud = f.cloud_provider or "unknown-cloud"
    resource = f.resource_id or f.resource_name or "unknown-resource"
    check = f.check_id or (f.title[:40] if f.title else "unknown-check")
    if source == cloud and target == resource:
        return True
    if source == resource and target == check:
        return True
    if source in (resource, f.resource_id or "", f.resource_name or "") and target == check:
        return True
    return False


def _build_story(source: str, target: str, risk_score: float, findings: list[Finding]) -> dict:
    contributing = [f for f in findings if _finding_on_edge(f, source, target)]
    steps: list[dict] = []
    if not contributing:
        steps = [
            {
                "step": 1,
                "title": "Aggregated attack edge",
                "summary": (
                    f"This path connects {source} to {target} with aggregated risk score {risk_score:.1f}. "
                    "Ingest more findings to attach concrete checks and resources."
                ),
            }
        ]
    else:
        for i, f in enumerate(contributing[:8]):
            steps.append(
                {
                    "step": i + 1,
                    "title": (f.title or "Finding")[:240],
                    "severity": f.severity,
                    "tool": f.tool,
                    "domain": f.domain,
                    "summary": f"{f.tool} reported {f.severity} in {f.domain} for this hop.",
                }
            )
    return {
        "path_id": _path_id(source, target),
        "source": source,
        "target": target,
        "risk": risk_score,
        "steps": steps,
    }


@router.get("")
def attack_paths(db: Session = Depends(get_db)):
    g = _build_graph(db)
    return {"nodes": g["nodes"], "edges": g["edges"], "top_paths": g["top_paths"]}


@router.get("/graph")
def attack_asset_graph(db: Session = Depends(get_db)):
    """Same graph with explicit metadata for UI / graph widgets."""
    g = _build_graph(db)
    return {
        "nodes": g["nodes"],
        "edges": g["edges"],
        "top_paths": g["top_paths"],
        "meta": {
            "node_count": len(g["nodes"]),
            "edge_count": len(g["edges"]),
            "description": "Cloud → resource → check edges derived from findings; expands with more ingest.",
        },
    }


@router.get("/story/{path_id}")
def attack_story(path_id: str, db: Session = Depends(get_db)):
    g = _build_graph(db)
    path_risk: dict[tuple[str, str], float] = {}
    findings = db.query(Finding).limit(1000).all()
    for f in findings:
        cloud = f.cloud_provider or "unknown-cloud"
        resource = f.resource_id or f.resource_name or "unknown-resource"
        check = f.check_id or (f.title[:40] if f.title else "unknown-check")
        sev = (f.severity or "MEDIUM").upper()
        risk = float(SEV_WEIGHT.get(sev, 3))
        c_r = (cloud, resource)
        r_k = (resource, check)
        path_risk[c_r] = path_risk.get(c_r, 0.0) + risk
        path_risk[r_k] = path_risk.get(r_k, 0.0) + risk

    for (source, target), score in path_risk.items():
        if _path_id(source, target) == path_id:
            return _build_story(source, target, score, findings)

    raise HTTPException(status_code=404, detail="Attack path not found")
