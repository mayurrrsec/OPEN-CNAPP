import os
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from api.auth import create_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginInput(BaseModel):
    username: str
    password: str


@router.post("/login")
def login(payload: LoginInput):
    expected_user = os.getenv("OPENCNAPP_ADMIN_USER", "admin")
    expected_pass = os.getenv("OPENCNAPP_ADMIN_PASSWORD", "admin")
    if payload.username != expected_user or payload.password != expected_pass:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(payload.username)
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me")
def me(user: str = Depends(get_current_user)):
    return {"user": user}
