from fastapi import APIRouter, Query

from app.services.demo.state import demo_state
from app.services.maintenance.trigger import schedule_maintenance_for_idle_machines

router = APIRouter()


@router.get("/tasks")
async def list_tasks(status: str | None = Query(default=None)) -> list[dict]:
    for site in demo_state.sites():
        await schedule_maintenance_for_idle_machines(site["id"])

    tasks = demo_state.maintenance()
    if status:
        tasks = [t for t in tasks if t["status"] == status]
    return tasks
