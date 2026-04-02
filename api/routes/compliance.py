from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.auth import get_current_user
from api.database.session import get_db
from api.models import Finding

router = APIRouter(prefix="/compliance", tags=["compliance"], dependencies=[Depends(get_current_user)])
FRAMEWORKS = ["CIS", "NIST", "PCI-DSS", "SOC2", "ISO27001"]


@router.get("/frameworks")
def frameworks():
    return FRAMEWORKS


@router.get("/control-model")
def control_model():
    """Static control taxonomy; enforcement mapping stays tied to finding compliance tags."""
    return {
        "frameworks": [
            {
                "id": fw,
                "title": fw,
                "domains": ["Identity", "Data protection", "Logging", "Network"],
            }
            for fw in FRAMEWORKS
        ],
        "policy_engine": "tag_rollups",
        "note": "Full policy-as-code and automated evidence collection are tracked on the roadmap.",
    }


@router.get("/heatmap")
def heatmap(db: Session = Depends(get_db)):
    counts: Counter[str] = Counter()
    for finding in db.query(Finding).all():
        for raw in finding.compliance or []:
            tag = str(raw).strip()
            prefix = _framework_prefix(tag)
            if prefix:
                counts[prefix] += 1
    return [{"framework": fw, "findings": counts.get(fw.upper(), 0)} for fw in FRAMEWORKS]


def _framework_prefix(tag: str) -> str:
    t = str(tag).strip()
    if not t:
        return ""
    for fw in FRAMEWORKS:
        if t.upper().startswith(fw.upper()):
            return fw.upper()
    part = t.split(":")[0].split("-")[0].strip()
    return part.upper()[:32]


@router.get("/control-grid")
def control_grid(framework: str | None = None, db: Session = Depends(get_db)):
    """Per-control rollups derived from finding compliance tags × severity."""
    rows: dict[str, dict] = {}
    for f in db.query(Finding).all():
        sev = (f.severity or "MEDIUM").upper()
        for tag in f.compliance or []:
            key = str(tag).strip()[:500]
            if not key:
                continue
            prefix = _framework_prefix(key)
            if framework and framework.upper() not in (prefix, "") and not key.upper().startswith(framework.upper()):
                if prefix != framework.upper():
                    continue
            if key not in rows:
                rows[key] = {
                    "control": key,
                    "framework": prefix or None,
                    "critical": 0,
                    "high": 0,
                    "medium": 0,
                    "low": 0,
                    "info": 0,
                }
            bucket = rows[key]
            if sev == "CRITICAL":
                bucket["critical"] += 1
            elif sev == "HIGH":
                bucket["high"] += 1
            elif sev == "MEDIUM":
                bucket["medium"] += 1
            elif sev == "LOW":
                bucket["low"] += 1
            else:
                bucket["info"] += 1

    def score(r: dict) -> int:
        return r["critical"] * 5 + r["high"] * 3 + r["medium"] * 2 + r["low"] + r["info"]

    sorted_rows = sorted(rows.values(), key=score, reverse=True)
    return {"rows": sorted_rows}
