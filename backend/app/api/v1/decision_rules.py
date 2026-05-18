from typing import Annotated, Any

from fastapi import APIRouter, Depends

from app.core.security import CurrentUser, require_admin
from pydantic import BaseModel, Field

from app.services.demo.state import demo_state

router = APIRouter()


class DecisionRulesPayload(BaseModel):
    rules: list[dict[str, Any]] = Field(default_factory=list)


@router.get("")
async def list_rules() -> list[dict[str, Any]]:
    return demo_state.decision_rules()


@router.put("")
async def replace_rules(
    payload: DecisionRulesPayload,
    _admin: Annotated[CurrentUser, Depends(require_admin)],
) -> list[dict[str, Any]]:
    """Обновить справочник правил журнала решений."""
    return demo_state.update_decision_rules(payload.rules)
