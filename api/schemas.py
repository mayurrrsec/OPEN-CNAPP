from datetime import datetime
from typing import Any
from pydantic import BaseModel

class FindingCreate(BaseModel):
    source: str
    tool: str
    title: str
    description: str | None = None
    severity: str
    domain: str
    cloud: str
    resource_id: str
    compliance: list[str] = []
    remediation: str | None = None
    raw: dict[str, Any] = {}
    risk_score: float = 0

class FindingOut(FindingCreate):
    id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class ScanTrigger(BaseModel):
    plugin: str
    connector: str

class ScanOut(BaseModel):
    id: int
    plugin: str
    connector: str
    status: str

    class Config:
        from_attributes = True
