import hashlib
import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, JSON, Float, Text

from api.database.session import Base


class Finding(Base):
    __tablename__ = "findings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    scan_id = Column(String(36), index=True, nullable=True)

    tool = Column(String(50), nullable=False, index=True)
    source = Column(String(30), nullable=False, index=True)

    domain = Column(String(30), nullable=False, index=True)
    severity = Column(String(10), nullable=False, index=True)
    cvss_score = Column(Float, nullable=True)
    cve_id = Column(String(30), nullable=True)

    cloud_provider = Column(String(20), nullable=True, index=True)
    account_id = Column(String(200), nullable=True)
    region = Column(String(100), nullable=True)
    resource_type = Column(String(200), nullable=True)
    resource_id = Column(Text, nullable=True, index=True)
    resource_name = Column(String(500), nullable=True)
    namespace = Column(String(200), nullable=True)

    check_id = Column(String(200), nullable=True)
    title = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    remediation = Column(Text, nullable=True)

    compliance = Column(JSON, default=list)
    raw = Column(JSON, default=dict)

    fingerprint = Column(String(64), index=True, nullable=True)
    assigned_to = Column(String(200), nullable=True)
    ticket_ref = Column(String(500), nullable=True)

    status = Column(String(30), default="open", index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    @staticmethod
    def compute_fingerprint(tool: str, check_id: str | None, resource_id: str | None, title: str) -> str:
        raw = f"{tool}|{check_id or ''}|{resource_id or ''}|{title}"
        return hashlib.sha256(raw.encode()).hexdigest()
