from fastapi import APIRouter

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/csv")
def export_csv():
    return {"status": "not_implemented", "message": "CSV/PDF generation placeholder"}
