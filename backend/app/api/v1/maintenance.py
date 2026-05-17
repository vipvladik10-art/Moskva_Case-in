from fastapi import APIRouter, Query

router = APIRouter()


@router.get("/tasks")
async def list_tasks(status: str | None = Query(default=None)) -> list[dict]:
    """TODO(P1, S3): фильтрация по статусу, JOIN с machines."""
    return []


@router.post("/tasks", status_code=201)
async def create_task(payload: dict) -> dict:
    return {"id": 0, **payload}


@router.patch("/tasks/{task_id}")
async def update_task(task_id: int, payload: dict) -> dict:
    return {"id": task_id, **payload}
