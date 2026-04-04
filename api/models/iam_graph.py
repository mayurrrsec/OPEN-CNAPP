"""IAM / access graph nodes and edges (Orca-style panel graph)."""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, JSON, String, Text, UniqueConstraint

from api.database.session import Base


class GraphNode(Base):
    __tablename__ = "graph_nodes"
    __table_args__ = (UniqueConstraint("connector_id", "external_id", name="uq_graph_nodes_connector_external"),)

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    connector_id = Column(String(36), ForeignKey("connectors.id", ondelete="CASCADE"), nullable=False, index=True)
    cloud_account_id = Column(String(64), nullable=True, index=True)
    provider = Column(String(20), nullable=False, index=True)
    node_type = Column(String(64), nullable=False, index=True)
    external_id = Column(Text, nullable=False)
    label = Column(Text, nullable=True)
    properties = Column(JSON, nullable=False, default=lambda: {})
    last_seen = Column(DateTime, default=datetime.utcnow, nullable=False)


class GraphEdge(Base):
    __tablename__ = "graph_edges"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    connector_id = Column(String(36), ForeignKey("connectors.id", ondelete="CASCADE"), nullable=False, index=True)
    source_node_id = Column(String(36), ForeignKey("graph_nodes.id", ondelete="CASCADE"), nullable=False, index=True)
    target_node_id = Column(String(36), ForeignKey("graph_nodes.id", ondelete="CASCADE"), nullable=False, index=True)
    edge_type = Column(String(64), nullable=False, index=True)
    properties = Column(JSON, nullable=False, default=lambda: {})
    last_seen = Column(DateTime, default=datetime.utcnow, nullable=False)
