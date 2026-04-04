"""Validate in-cluster agent join tokens (hash lookup)."""

from __future__ import annotations

import hashlib

from sqlalchemy.orm import Session

from api.models.agent_join_token import AgentJoinToken


def _hash(plain: str) -> str:
    return hashlib.sha256(plain.encode("utf-8")).hexdigest()


def verify_join_token(db: Session, plain: str | None) -> AgentJoinToken | None:
    if not plain or not plain.startswith("ocn_"):
        return None
    h = _hash(plain)
    return db.query(AgentJoinToken).filter(AgentJoinToken.token_hash == h).first()
