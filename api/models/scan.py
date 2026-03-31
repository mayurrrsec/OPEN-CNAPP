import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, JSON, Integer
from api.database.session import Base


class Scan(Base):
    __tablename__ = "scans"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    plugin = Column(String(100), index=True, nullable=False)
    connector = Column(String(100), index=True, nullable=False)
    status = Column(String(30), default="queued", index=True)
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)
    findings_count = Column(Integer, default=0)
    error_message = Column(String(1000), nullable=True)
    meta = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
