"""Аутентификация API: Bearer-токены (MVP) с заделом под Keycloak OIDC."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated, Literal

from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings

Role = Literal["viewer", "admin"]

_bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class CurrentUser:
    role: Role


def resolve_role_from_token(token: str) -> Role | None:
    if token == settings.admin_api_token:
        return "admin"
    if token == settings.viewer_api_token:
        return "viewer"
    return None


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Security(_bearer)],
) -> CurrentUser:
    if not settings.auth_enabled:
        return CurrentUser(role="admin")

    if credentials is None or credentials.scheme.lower() != "bearer":
        return CurrentUser(role="viewer")

    role = resolve_role_from_token(credentials.credentials)
    if role is None:
        raise HTTPException(status_code=401, detail="Invalid API token")
    return CurrentUser(role=role)


async def require_admin(
    user: Annotated[CurrentUser, Depends(get_current_user)],
) -> CurrentUser:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    return user


def validate_keycloak_jwt(_token: str) -> CurrentUser:
    """Заглушка для OIDC/Keycloak (спринт 3+)."""
    raise NotImplementedError("Keycloak OIDC is not configured; use Bearer API tokens")
