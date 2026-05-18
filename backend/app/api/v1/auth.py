from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.security import resolve_role_from_token

router = APIRouter()


class LoginRequest(BaseModel):
    token: str


class LoginResponse(BaseModel):
    role: Literal["viewer", "admin"]
    token: str


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest) -> LoginResponse:
    role = resolve_role_from_token(body.token)
    if role is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    return LoginResponse(role=role, token=body.token)
