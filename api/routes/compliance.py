from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.database.session import get_db
from api.models import Finding

router = APIRouter(prefix="/compliance", tags=["compliance"])
FRAMEWORKS = ["CIS", "NIST", "PCI-DSS", "SOC2", "ISO27001"]


@router.get("/frameworks")
def frameworks():
    return FRAMEWORKS


@router.get("/heatmap")
def heatmap(db: Session = Depends(get_db)):
    counts = Counter()
    for finding in db.query(Finding).all():
        for fw in finding.compliance or []:
            counts[str(fw).upper()] += 1
    return [{"framework": fw, "findings": counts.get(fw.upper(), 0)} for fw in FRAMEWORKS]


@router.get('/summary')
def compliance_summary(db: Session = Depends(get_db)):
    rows = heatmap(db)
    mapped = sum(item['findings'] for item in rows)
    top_gaps = sorted(rows, key=lambda x: x['findings'], reverse=True)[:3]
    return {
        'heatmap': rows,
        'top_gaps': top_gaps,
        'total_mapped_findings': mapped,
    }
