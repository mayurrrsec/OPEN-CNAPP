from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from api.auth import get_current_user
from api.database.session import get_db
from api.models import AgentJoinToken, User
from api.models.agent_join_token import generate_agent_join_token

router = APIRouter(prefix="/settings/agent-tokens", tags=["settings"])


class AgentJoinTokenOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    prefix: str
    created_at: str | None = None


class AgentJoinTokenCreate(BaseModel):
    name: str = Field(default="Cluster agent", min_length=1, max_length=128)


class AgentJoinTokenCreateResponse(BaseModel):
    id: str
    name: str
    prefix: str
    token: str
    created_at: str | None = None


@router.get("", response_model=list[AgentJoinTokenOut])
def list_agent_tokens(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(AgentJoinToken)
        .filter(AgentJoinToken.user_id == user.id)
        .order_by(AgentJoinToken.created_at.desc())
        .all()
    )
    out: list[AgentJoinTokenOut] = []
    for r in rows:
        created = r.created_at.isoformat() if r.created_at else None
        out.append(
            AgentJoinTokenOut(id=r.id, name=r.name, prefix=r.prefix, created_at=created)
        )
    return out


@router.post("", response_model=AgentJoinTokenCreateResponse)
def create_agent_token(
    payload: AgentJoinTokenCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plain, prefix, token_hash = generate_agent_join_token()
    row = AgentJoinToken(
        user_id=user.id,
        name=payload.name.strip() or "Cluster agent",
        token_hash=token_hash,
        prefix=prefix,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    created = row.created_at.isoformat() if row.created_at else None
    return AgentJoinTokenCreateResponse(
        id=row.id,
        name=row.name,
        prefix=row.prefix,
        token=plain,
        created_at=created,
    )


@router.delete("/{token_id}")
def delete_agent_token(
    token_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = (
        db.query(AgentJoinToken)
        .filter(AgentJoinToken.id == token_id, AgentJoinToken.user_id == user.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Token not found")
    db.delete(row)
    db.commit()
    return {"ok": True}
