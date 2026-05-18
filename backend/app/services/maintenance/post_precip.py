"""Наряды после окончания дождя (делегирует в MaintenancePlanner)."""

from __future__ import annotations

from typing import Any

from app.services.maintenance.planner import maintenance_planner


def schedule_post_rain_tasks(site_id: int) -> list[dict[str, Any]]:
    """Создать follow-up наряды после снятия дождя с участка."""
    return maintenance_planner.handle_rain_ended(site_id)
