from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field


class FindingCreate(BaseModel):
    scan_id: str | None = None
    tool: str
    source: str = "ci_ingest"
    domain: str
    severity: str
    cvss_score: float | None = None
    cve_id: str | None = None
    cloud_provider: str | None = None
    account_id: str | None = None
    region: str | None = None
    resource_type: str | None = None
    resource_id: str | None = None
    resource_name: str | None = None
    namespace: str | None = None
    check_id: str | None = None
    title: str
    description: str | None = None
    remediation: str | None = None
    compliance: list[str] = Field(default_factory=list)
    raw: dict[str, Any] = Field(default_factory=dict)


class FindingOut(FindingCreate):
    id: str
    status: str
    assigned_to: str | None = None
    ticket_ref: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ScanTrigger(BaseModel):
    plugin: str
    connector: str
    source: str = "on_demand"
    confirm_active_scan: bool = False


class ScanOut(BaseModel):
    id: str
    plugin: str
    connector: str
    status: str

    model_config = {"from_attributes": True}
