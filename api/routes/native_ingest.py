from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from api.connectors.aws import AwsConnector
from api.connectors.azure import AzureConnector
from api.connectors.gcp import GcpConnector
from api.attack_path_builder import rebuild_all_attack_paths
from api.database.session import get_db
from api.models import Finding

router = APIRouter(prefix="/native-ingest", tags=["native-ingest"])
CONNECTOR_MAP = {
    "azure": (AzureConnector, "defender_for_cloud", "cspm"),
    "aws": (AwsConnector, "aws_security_hub", "cspm"),
    "gcp": (GcpConnector, "gcp_scc", "cspm"),
}


@router.post("/{provider}")
def ingest_native(provider: str, db: Session = Depends(get_db)):
    cfg = CONNECTOR_MAP.get(provider)
    if not cfg:
        raise HTTPException(status_code=404, detail="Provider not supported")

    connector_cls, tool_name, domain = cfg
    findings = connector_cls().ingest_native_findings()
    created = 0
    for row in findings:
        title = row.get("title") or row.get("Title") or "Native security finding"
        check_id = row.get("check_id") or row.get("Id")
        resource_id = row.get("resource_id") or row.get("ResourceId")
        fingerprint = Finding.compute_fingerprint(tool_name, check_id, resource_id, title)
        existing = db.query(Finding).filter(Finding.fingerprint == fingerprint, Finding.status != "resolved").first()
        if existing:
            continue
        db.add(
            Finding(
                tool=tool_name,
                source="native_ingest",
                domain=domain,
                severity=str(row.get("severity") or row.get("Severity") or "MEDIUM").upper(),
                title=title,
                check_id=check_id,
                resource_id=resource_id,
                cloud_provider=provider,
                description=row.get("description") or row.get("Description"),
                remediation=row.get("remediation") or row.get("Remediation"),
                compliance=row.get("compliance", []),
                raw=row,
                fingerprint=fingerprint,
            )
        )
        created += 1

    db.commit()
    try:
        rebuild_all_attack_paths(db)
    except Exception:
        pass
    return {"provider": provider, "ingested": created}
