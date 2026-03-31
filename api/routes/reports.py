import csv
import io

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from api.database.session import get_db
from api.models import Finding

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/csv")
def export_csv(db: Session = Depends(get_db)):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "tool", "severity", "domain", "title", "status", "assigned_to", "ticket_ref"])
    for f in db.query(Finding).order_by(Finding.created_at.desc()).limit(5000).all():
        writer.writerow([f.id, f.tool, f.severity, f.domain, f.title, f.status, f.assigned_to, f.ticket_ref])
    return Response(content=output.getvalue(), media_type="text/csv")
