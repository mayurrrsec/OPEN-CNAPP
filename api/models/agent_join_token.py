import hashlib
import secrets
import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, func

from api.database.session import Base


def _hash_token(plain: str) -> str:
    return hashlib.sha256(plain.encode("utf-8")).hexdigest()


def generate_agent_join_token() -> tuple[str, str, str]:
    """Returns (full_token, prefix_for_display, sha256_hex)."""
    body = secrets.token_hex(24)
    plain = f"ocn_{body}"
    prefix = plain[:10] + "…"
    return plain, prefix, _hash_token(plain)


class AgentJoinToken(Base):
    """Stored join secret for in-cluster agents (hash only; plaintext shown once at creation)."""

    __tablename__ = "agent_join_tokens"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(128), nullable=False, default="Cluster agent")
    token_hash = Column(String(64), nullable=False)
    prefix = Column(String(24), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
