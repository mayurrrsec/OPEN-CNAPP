import csv
import io
from datetime import datetime

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from api.auth import get_current_user
from api.database.session import get_db
from api.models import Finding

router = APIRouter(prefix="/reports", tags=["reports"], dependencies=[Depends(get_current_user)])


@router.get("/csv")
def export_csv(db: Session = Depends(get_db)):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "tool", "severity", "domain", "title", "status", "assigned_to", "ticket_ref"])
    for f in db.query(Finding).order_by(Finding.created_at.desc()).limit(5000).all():
        writer.writerow([f.id, f.tool, f.severity, f.domain, f.title, f.status, f.assigned_to, f.ticket_ref])
    return Response(content=output.getvalue(), media_type="text/csv")


@router.get("/pdf")
def export_pdf(db: Session = Depends(get_db)):
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
    except Exception:
        return Response(content="reportlab not installed", media_type="text/plain", status_code=501)

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    c.drawString(40, 760, f"OpenCNAPP Compliance Report - {datetime.utcnow().isoformat()}")
    y = 730
    rows = db.query(Finding).order_by(Finding.created_at.desc()).limit(50).all()
    for f in rows:
        c.drawString(40, y, f"[{f.severity}] {f.tool} {f.title[:80]}")
        y -= 14
        if y < 80:
            c.showPage()
            y = 760
    c.save()
    pdf = buf.getvalue()
    return Response(content=pdf, media_type="application/pdf")
