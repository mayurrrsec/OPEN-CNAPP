from sqlalchemy import Column, Integer, String, Boolean, JSON
from api.database.session import Base

class Plugin(Base):
    __tablename__ = "plugins"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True)
    display_name = Column(String(200))
    domain = Column(String(50), index=True)
    run_mode = Column(String(50), default="container")
    enabled = Column(Boolean, default=True)
    schedule = Column(String(100), nullable=True)
    config = Column(JSON, default=dict)
