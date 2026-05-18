from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.security import CurrentUser, get_current_user
from app.schemas.maintenance import MaintenanceTaskPatch
from app.services.maintenance.demo_repository import maintenance_repository

router = APIRouter()


@router.get("/tasks")
async def list_tasks(
    status: str | None = Query(default=None),
    site_id: int | None = Query(default=None),
    phase: str | None = Query(default=None),
    trigger_source: str | None = Query(default=None),
) -> list[dict]:
    return maintenance_repository.list(
        status=status,
        site_id=site_id,
        phase=phase,
        trigger_source=trigger_source,
    )


@router.get("/tasks/{task_id}")
async def get_task(task_id: int) -> dict:
    task = maintenance_repository.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.patch("/tasks/{task_id}")
async def patch_task(
    task_id: int,
    payload: MaintenanceTaskPatch,
    _user: Annotated[CurrentUser, Depends(get_current_user)],
) -> dict:
    updated = maintenance_repository.update_status(task_id, payload.status)
    if not updated:
        raise HTTPException(status_code=404, detail="Task not found")
    return updated
