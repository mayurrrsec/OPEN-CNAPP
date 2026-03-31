import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, JSON, DateTime
from api.database.session import Base


class Plugin(Base):
    __tablename__ = "plugins"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), unique=True, index=True)
    display_name = Column(String(200), nullable=False)
    domain = Column(String(50), index=True)
    run_mode = Column(String(50), default="container")
    normalizer = Column(String(255), nullable=True)
    image = Column(String(255), nullable=True)
    schedule = Column(String(100), nullable=True)
    enabled = Column(Boolean, default=True)
    config = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
