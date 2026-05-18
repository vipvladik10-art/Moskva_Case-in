from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.core.security import CurrentUser, require_admin
from app.services.demo.scenario import end_rain, reset_demo, run_sudden_storm
from app.services.demo.state import demo_state

router = APIRouter()


@router.post("/sudden-storm")
async def trigger_sudden_storm(
    site_id: int = Query(default=2, ge=1, description="Участок, на который приходит дождь"),
    redirect_count: int = Query(default=3, ge=1, le=10),
) -> dict:
    """Главный демо-сценарий: внезапный дождь и реакция системы."""
    return run_sudden_storm(rain_site_id=site_id, redirect_count=redirect_count)


@router.post("/end-rain")
async def trigger_end_rain() -> dict:
    """Снять демо-дождь и создать наряды на работы после осадков."""
    return end_rain()


@router.post("/reset")
async def reset(_admin: Annotated[CurrentUser, Depends(require_admin)]) -> dict:
    return reset_demo()


@router.get("/decisions")
async def decisions(
    limit: int = Query(default=50, ge=1, le=500),
    task_id: int | None = Query(default=None),
) -> list[dict]:
    items = demo_state.decisions()
    if task_id is not None:
        items = [d for d in items if d.get("task_id") == task_id]
    return items[-limit:][::-1]


@router.get("/state")
async def state() -> dict:
    return {
        "rain_site_id": demo_state.rain_site_id(),
        "trucks": demo_state.trucks(),
        "maintenance": demo_state.maintenance(),
        "decisions": demo_state.decisions()[-20:][::-1],
    }
