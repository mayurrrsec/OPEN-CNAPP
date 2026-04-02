"""Node names discovered from findings (optional materialized view per cluster connector)."""

import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, UniqueConstraint

from api.database.session import Base


class K8sNode(Base):
    __tablename__ = "k8s_nodes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    connector_id = Column(String(36), ForeignKey("connectors.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(500), nullable=False)
    last_seen = Column(DateTime, nullable=True)

    __table_args__ = (UniqueConstraint("connector_id", "name", name="uq_k8s_nodes_connector_name"),)
