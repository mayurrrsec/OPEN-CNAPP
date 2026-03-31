from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from api.database.session import get_db
from api.models import Finding

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/summary")
def summary(db: Session = Depends(get_db)):
    total = db.query(func.count(Finding.id)).scalar() or 0
    open_ = db.query(func.count(Finding.id)).filter(Finding.status == "open").scalar() or 0
    critical = db.query(func.count(Finding.id)).filter(Finding.severity == "critical").scalar() or 0
    score = max(0, 100 - (critical * 2 + open_ // 10))
    return {"total_findings": total, "open_findings": open_, "critical": critical, "secure_score": score}
