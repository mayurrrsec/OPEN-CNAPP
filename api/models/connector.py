from sqlalchemy import Column, Integer, String, JSON, Boolean
from api.database.session import Base

class Connector(Base):
    __tablename__ = "connectors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True)
    display_name = Column(String(200))
    connector_type = Column(String(50), index=True)
    encrypted_credentials = Column(String(4000), nullable=True)
    settings = Column(JSON, default=dict)
    enabled = Column(Boolean, default=True)
