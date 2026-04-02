import os
import uuid

from passlib.context import CryptContext
from sqlalchemy.orm import Session

from api.models import User, Workspace

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def ensure_bootstrap_admin(db: Session) -> None:
    """Create the first admin from env when the users table is empty."""
    if db.query(User).count() > 0:
        return

    email = os.getenv("OPENCNAPP_ADMIN_EMAIL", "").strip().lower()
    password = os.getenv("OPENCNAPP_ADMIN_PASSWORD", "")
    legacy = os.getenv("OPENCNAPP_ADMIN_USER", "").strip()

    if not email and legacy:
        email = f"{legacy}@example.com".lower()
    if not email:
        email = "admin@example.com"
    if not password:
        password = "admin"

    user = User(
        email=email,
        password_hash=pwd_context.hash(password),
        role="admin",
        auth_provider="local",
        is_active=True,
    )
    db.add(user)
    db.commit()


def ensure_default_workspace(db: Session) -> None:
    """Create the default workspace with a UUID tenant id when none exist."""
    if db.query(Workspace).count() > 0:
        return
    db.add(Workspace(id=str(uuid.uuid4()), name="Default workspace"))
    db.commit()
