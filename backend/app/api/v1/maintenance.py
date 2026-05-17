from fastapi import APIRouter, Query

from app.services.demo.state import demo_state

router = APIRouter()


@router.get("/tasks")
async def list_tasks(status: str | None = Query(default=None)) -> list[dict]:
    tasks = demo_state.maintenance()
    if status:
        tasks = [t for t in tasks if t["status"] == status]
    return tasks
