from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, JSON, Float, Text
from api.database.session import Base

class Finding(Base):
    __tablename__ = "findings"

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String(100), index=True)
    tool = Column(String(100), index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(String(20), index=True)
    domain = Column(String(50), index=True)
    cloud = Column(String(50), index=True)
    resource_id = Column(String(300), index=True)
    compliance = Column(JSON, default=list)
    remediation = Column(Text, nullable=True)
    raw = Column(JSON, default=dict)
    risk_score = Column(Float, default=0)
    status = Column(String(30), default="open")
    created_at = Column(DateTime, default=datetime.utcnow)
