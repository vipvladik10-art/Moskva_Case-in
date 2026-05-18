from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException

from app.core.security import CurrentUser, require_admin
from pydantic import BaseModel, Field

from app.services.demo.state import demo_state

router = APIRouter()


class FleetPayload(BaseModel):
    vehicles: list[dict[str, Any]] = Field(default_factory=list)
    workers: list[dict[str, Any]] = Field(default_factory=list)


@router.get("")
async def get_fleet() -> dict[str, Any]:
    """Справочник парка техники и штата по разрядам."""
    return demo_state.fleet()


@router.put("")
async def replace_fleet(
    payload: FleetPayload,
    _admin: Annotated[CurrentUser, Depends(require_admin)],
) -> dict[str, Any]:
    """Полностью заменить справочник (редактирование без деплоя)."""
    try:
        return demo_state.update_fleet(payload.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
