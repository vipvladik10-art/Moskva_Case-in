"""Триггер планирования ТО при погодном риске (делегирует в MaintenancePlanner)."""

from __future__ import annotations

from app.services.maintenance.planner import maintenance_planner


async def schedule_maintenance_for_idle_machines(site_id: int) -> list[int]:
    """Создать ТО-наряды для простаивающей техники, если прогноз даёт риск осадков."""
    tasks = await maintenance_planner.handle_forecast_risk(site_id)
    return [int(t["id"]) for t in tasks]
