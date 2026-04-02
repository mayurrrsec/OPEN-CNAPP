import os
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
import jwt
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from api.auth import create_access_token, get_current_user
from api.database.session import get_db
from api.models import User
from api.tenant import resolve_tenant_id

router = APIRouter(prefix="/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

_oidc_discovery_cache: dict[str, dict] = {}


class LoginInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


def _tenant_id() -> str:
    return (os.getenv("OPENCNAPP_TENANT_ID", "default") or "default").strip() or "default"


class MeOut(BaseModel):
    id: str
    email: str
    role: str
    auth_provider: str
    tenant_id: str


def _issuer_base() -> str | None:
    raw = os.getenv("OIDC_ISSUER", "").strip()
    return raw.rstrip("/") or None


def _dashboard_url() -> str:
    return os.getenv("OPENCNAPP_DASHBOARD_URL", "http://localhost:5173").rstrip("/")


def _oidc_redirect_uri() -> str:
    return os.getenv("OIDC_REDIRECT_URI", "http://localhost:8000/auth/oidc/callback").strip()


def _oidc_discovery(issuer: str) -> dict:
    if issuer in _oidc_discovery_cache:
        return _oidc_discovery_cache[issuer]
    url = f"{issuer}/.well-known/openid-configuration"
    r = httpx.get(url, timeout=30.0)
    r.raise_for_status()
    data = r.json()
    _oidc_discovery_cache[issuer] = data
    return data


def _oidc_admin_emails() -> set[str]:
    raw = os.getenv("OIDC_ADMIN_EMAILS", "")
    return {e.strip().lower() for e in raw.split(",") if e.strip()}


@router.get("/config")
def auth_config(db: Session = Depends(get_db)):
    issuer = _issuer_base()
    client_id = os.getenv("OIDC_CLIENT_ID", "").strip()
    oidc_ready = bool(issuer and client_id)
    api_public = os.getenv("OPENCNAPP_API_PUBLIC_URL", "http://localhost:8000").rstrip("/")
    return {
        "oidc_enabled": oidc_ready,
        "oidc_login_url": f"{api_public}/auth/oidc/login" if oidc_ready else None,
        "password_login_enabled": True,
        "tenant_id": resolve_tenant_id(db),
    }


@router.post("/login")
def login(payload: LoginInput, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if user.auth_provider != "local" or not user.password_hash:
        raise HTTPException(status_code=401, detail="Use SSO for this account")
    if not pwd_context.verify(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(user)
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=MeOut)
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return MeOut(
        id=user.id,
        email=user.email,
        role=user.role,
        auth_provider=user.auth_provider,
        tenant_id=resolve_tenant_id(db),
    )


@router.get("/oidc/login")
def oidc_login():
    issuer = _issuer_base()
    client_id = os.getenv("OIDC_CLIENT_ID", "").strip()
    if not issuer or not client_id:
        raise HTTPException(status_code=503, detail="OIDC is not configured")

    disc = _oidc_discovery(issuer)
    auth_ep = disc.get("authorization_endpoint")
    if not auth_ep:
        raise HTTPException(status_code=500, detail="OIDC discovery missing authorization_endpoint")

    secret = os.getenv("SECRET_KEY", "change-me")
    exp = datetime.now(timezone.utc) + timedelta(minutes=10)
    state = jwt.encode(
        {"nonce": secrets.token_hex(16), "exp": exp},
        secret,
        algorithm="HS256",
    )

    redirect_uri = _oidc_redirect_uri()
    q = urlencode(
        {
            "client_id": client_id,
            "response_type": "code",
            "scope": "openid email profile",
            "redirect_uri": redirect_uri,
            "state": state,
        }
    )
    return RedirectResponse(url=f"{auth_ep}?{q}", status_code=302)


@router.get("/oidc/callback")
def oidc_callback(code: str | None = None, state: str | None = None, db: Session = Depends(get_db)):
    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing code or state")

    issuer = _issuer_base()
    client_id = os.getenv("OIDC_CLIENT_ID", "").strip()
    client_secret = os.getenv("OIDC_CLIENT_SECRET", "").strip()
    if not issuer or not client_id:
        raise HTTPException(status_code=503, detail="OIDC is not configured")

    secret = os.getenv("SECRET_KEY", "change-me")
    try:
        jwt.decode(state, secret, algorithms=["HS256"])
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=400, detail="Invalid state") from exc

    disc = _oidc_discovery(issuer)
    token_ep = disc.get("token_endpoint")
    userinfo_ep = disc.get("userinfo_endpoint")
    if not token_ep:
        raise HTTPException(status_code=500, detail="OIDC discovery missing token_endpoint")

    redirect_uri = _oidc_redirect_uri()
    body = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri,
        "client_id": client_id,
    }
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    data = urlencode({**body, "client_secret": client_secret} if client_secret else body)

    r = httpx.post(token_ep, content=data, headers=headers, timeout=30.0)
    if r.status_code >= 400:
        raise HTTPException(status_code=401, detail="Token exchange failed")
    tok = r.json()
    access = tok.get("access_token")
    if not access:
        raise HTTPException(status_code=401, detail="No access_token from IdP")

    email = None
    if userinfo_ep:
        ui = httpx.get(userinfo_ep, headers={"Authorization": f"Bearer {access}"}, timeout=30.0)
        if ui.status_code < 400:
            info = ui.json()
            email = (info.get("email") or info.get("preferred_username") or "").strip().lower()

    if not email and tok.get("id_token"):
        idt = tok["id_token"]
        try:
            claims = jwt.decode(
                idt,
                algorithms=["RS256", "HS256", "ES256"],
                options={"verify_signature": False},
            )
            email = (claims.get("email") or claims.get("preferred_username") or "").strip().lower()
        except jwt.PyJWTError:
            pass

    if not email:
        raise HTTPException(status_code=400, detail="Could not resolve user email from IdP")

    admins = _oidc_admin_emails()
    role = "admin" if email in admins else "user"

    user = db.query(User).filter(User.email == email).first()
    if user:
        if not user.is_active:
            raise HTTPException(status_code=403, detail="Account disabled")
        if user.role == "user" and role == "admin":
            user.role = "admin"
        if user.auth_provider != "oidc":
            user.auth_provider = "oidc"
        db.commit()
        db.refresh(user)
    else:
        user = User(
            email=email,
            password_hash=None,
            role=role,
            auth_provider="oidc",
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token(user)
    dash = _dashboard_url()
    # Fragment avoids sending JWT to server logs on the dashboard origin.
    return RedirectResponse(url=f"{dash}/auth/callback#token={token}", status_code=302)
