"""In-memory репозиторий нарядов (DemoState)."""

from __future__ import annotations

from typing import Any

from app.services.demo.state import demo_state
from app.services.maintenance.dedup import ACTIVE_STATUSES


class DemoMaintenanceRepository:
    def find_active_by_dedup_key(self, dedup_key: str) -> dict[str, Any] | None:
        for task in demo_state.maintenance():
            if task.get("dedup_key") == dedup_key and task.get("status") in ACTIVE_STATUSES:
                return task
        return None

    def create(self, payload: dict[str, Any]) -> dict[str, Any]:
        return demo_state.add_maintenance(**payload)

    def update_status(self, task_id: int, status: str) -> dict[str, Any] | None:
        return demo_state.update_maintenance(task_id, status=status)

    def get(self, task_id: int) -> dict[str, Any] | None:
        return demo_state.maintenance_task(task_id)

    def list(
        self,
        *,
        status: str | None = None,
        site_id: int | None = None,
        phase: str | None = None,
        trigger_source: str | None = None,
    ) -> list[dict[str, Any]]:
        tasks = demo_state.maintenance()
        if status:
            tasks = [t for t in tasks if t.get("status") == status]
        if site_id is not None:
            tasks = [t for t in tasks if t.get("site_id") == site_id]
        if phase:
            tasks = [t for t in tasks if t.get("phase") == phase]
        if trigger_source:
            tasks = [t for t in tasks if t.get("trigger_source") == trigger_source]
        return tasks


maintenance_repository = DemoMaintenanceRepository()
