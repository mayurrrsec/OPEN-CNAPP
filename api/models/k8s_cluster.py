"""Cached K8s inventory counts per connector (populated by sync from findings)."""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String

from api.database.session import Base


class K8sCluster(Base):
    __tablename__ = "k8s_clusters"

    connector_id = Column(String(36), ForeignKey("connectors.id", ondelete="CASCADE"), primary_key=True)
    nodes_count = Column(Integer, default=0)
    workloads_count = Column(Integer, default=0)
    namespaces_count = Column(Integer, default=0)
    synced_at = Column(DateTime, nullable=True)
