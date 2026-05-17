from fastapi import APIRouter, Query

from app.services.demo.scenario import reset_demo, run_sudden_storm
from app.services.demo.state import demo_state

router = APIRouter()


@router.post("/sudden-storm")
async def trigger_sudden_storm(
    site_id: int = Query(default=2, ge=1, description="Участок, на который приходит дождь"),
    redirect_count: int = Query(default=3, ge=1, le=10),
) -> dict:
    """Главный демо-сценарий: внезапный дождь и реакция системы."""
    return run_sudden_storm(rain_site_id=site_id, redirect_count=redirect_count)


@router.post("/reset")
async def reset() -> dict:
    return reset_demo()


@router.get("/decisions")
async def decisions(limit: int = Query(default=50, ge=1, le=500)) -> list[dict]:
    items = demo_state.decisions()
    return items[-limit:][::-1]


@router.get("/state")
async def state() -> dict:
    return {
        "rain_site_id": demo_state.rain_site_id(),
        "trucks": demo_state.trucks(),
        "maintenance": demo_state.maintenance(),
        "decisions": demo_state.decisions()[-20:][::-1],
    }
