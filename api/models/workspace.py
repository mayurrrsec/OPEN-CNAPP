import uuid

from sqlalchemy import Column, DateTime, String, func

from api.database.session import Base


class Workspace(Base):
    """Logical workspace; `id` is the stable tenant identifier for agents (Helm `global.tenantId`)."""

    __tablename__ = "workspaces"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False, default="Default workspace")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
