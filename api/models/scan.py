from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, JSON
from api.database.session import Base

class Scan(Base):
    __tablename__ = "scans"

    id = Column(Integer, primary_key=True, index=True)
    plugin = Column(String(100), index=True)
    connector = Column(String(100), index=True)
    status = Column(String(30), default="queued")
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)
    meta = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
