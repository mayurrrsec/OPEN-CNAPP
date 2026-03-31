from fastapi import APIRouter

router = APIRouter(prefix="/compliance", tags=["compliance"])

@router.get("/frameworks")
def frameworks():
    return ["CIS", "NIST", "PCI-DSS", "SOC2", "ISO27001"]
