import uuid
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from passlib.context import CryptContext
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy.orm import Session

from api.auth import get_current_admin_user
from api.database.session import get_db
from api.models import User

router = APIRouter(prefix="/admin/users", tags=["admin"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: Literal["admin", "user"] = "user"


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    role: str
    auth_provider: str
    is_active: bool


class PasswordReset(BaseModel):
    password: str = Field(min_length=8, max_length=128)


@router.get("", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _: User = Depends(get_current_admin_user)):
    rows = db.query(User).order_by(User.created_at.desc()).all()
    return rows


@router.post("", response_model=UserOut)
def create_user(payload: UserCreate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    email = payload.email.strip().lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(
        id=str(uuid.uuid4()),
        email=email,
        password_hash=pwd_context.hash(payload.password),
        role=payload.role,
        auth_provider="local",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}/active")
def set_active(
    user_id: str,
    active: bool = Query(...),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id and not active:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")
    user.is_active = active
    db.commit()
    return {"id": user_id, "is_active": active}


@router.post("/{user_id}/password")
def reset_password(
    user_id: str,
    payload: PasswordReset,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.auth_provider != "local":
        raise HTTPException(status_code=400, detail="Password reset applies to local users only")
    user.password_hash = pwd_context.hash(payload.password)
    db.commit()
    return {"ok": True}


@router.delete("/{user_id}")
def delete_user(user_id: str, db: Session = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    db.delete(user)
    db.commit()
    return {"ok": True}
