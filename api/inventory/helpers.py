"""Helpers for inventory / KSPM views — match findings to connector-backed clusters."""

from sqlalchemy import or_
from sqlalchemy.orm import Session

from api.models import Connector, Finding

_MISCONFIG_DOMAINS = ("kspm", "cis", "cis-k8s", "compliance")


def misconfiguration_query(db: Session, connector: Connector):
    """KSPM / CIS-style misconfiguration findings for a cluster connector."""
    return findings_for_connector(db, connector).filter(Finding.domain.in_(_MISCONFIG_DOMAINS))


def cluster_label(settings: dict, connector_name: str) -> str:
    return str(settings.get("cluster_name") or connector_name)


def findings_for_connector(db: Session, connector: Connector):
    """Findings attributed to this cluster connector (best-effort until ingest tags connector_id)."""
    settings = connector.settings or {}
    cn = cluster_label(settings, connector.name)
    return db.query(Finding).filter(
        or_(
            Finding.account_id == connector.name,
            Finding.resource_id == cn,
            Finding.resource_name == cn,
        )
    )


def domain_bucket(domain: str | None) -> str:
    d = (domain or "").lower()
    if d in ("cspm", "cis", "cis-k8s") or d.startswith("cis-"):
        return "cis"
    if d == "kspm":
        return "kspm"
    if d in ("image-sec", "image_sec"):
        return "img"
    return "sec"
