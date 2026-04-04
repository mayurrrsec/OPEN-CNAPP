"""Persisted attack paths derived from findings (Orca-style list + graph)."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, JSON, String, Text

from api.database.session import Base


class AttackPath(Base):
    __tablename__ = "attack_paths"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(Text, nullable=False)
    impact_score = Column(Float, nullable=False, default=0.0)
    probability_score = Column(Float, nullable=False, default=0.0)
    risk_score = Column(Float, nullable=False, default=0.0)
    is_exposed_internet = Column(Boolean, nullable=False, default=False)
    exposure_type = Column(String(50), nullable=True)
    path_length = Column(Integer, nullable=False, default=0)
    source_resource_id = Column(Text, nullable=True)
    source_resource_type = Column(String(200), nullable=True)
    target_resource_id = Column(Text, nullable=True)
    target_resource_type = Column(String(200), nullable=True)
    is_crown_jewel = Column(Boolean, nullable=False, default=False)
    cloud_provider = Column(String(20), nullable=True)
    connector_id = Column(String(36), ForeignKey("connectors.id", ondelete="SET NULL"), nullable=True, index=True)
    account_id = Column(String(200), nullable=True, index=True)
    finding_ids = Column(JSON, nullable=False, default=lambda: [])
    edge_ids = Column(JSON, nullable=False, default=lambda: [])
    status = Column(String(20), nullable=False, default="active")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class AttackPathEdge(Base):
    __tablename__ = "attack_path_edges"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    attack_path_id = Column(String(36), ForeignKey("attack_paths.id", ondelete="CASCADE"), nullable=False, index=True)
    source_key = Column(String(512), nullable=False)
    target_key = Column(String(512), nullable=False)
    source_finding_id = Column(String(36), nullable=True, index=True)
    target_finding_id = Column(String(36), nullable=True, index=True)
    source_resource_id = Column(Text, nullable=True)
    target_resource_id = Column(Text, nullable=True)
    source_resource_type = Column(String(200), nullable=True)
    target_resource_type = Column(String(200), nullable=True)
    edge_type = Column(String(50), nullable=False, default="aggregated")
    risk_weight = Column(Float, nullable=False, default=1.0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
