import uuid
from datetime import datetime
from sqlalchemy import Column, String, JSON, Boolean, DateTime
from api.database.session import Base


class Connector(Base):
    __tablename__ = "connectors"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), unique=True, index=True)
    display_name = Column(String(200), nullable=False)
    connector_type = Column(String(50), index=True)
    encrypted_credentials = Column(String(4000), nullable=True)
    settings = Column(JSON, default=dict)
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
