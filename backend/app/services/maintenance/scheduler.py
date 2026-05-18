"""Фоновый опрос прогноза и планирование нарядов ТО."""

from __future__ import annotations

import asyncio
import logging

from app.core.config import settings
from app.services.demo.state import demo_state
from app.services.maintenance.planner import maintenance_planner

logger = logging.getLogger(__name__)

_forecast_task: asyncio.Task[None] | None = None


async def _forecast_maintenance_loop() -> None:
    interval = max(60, settings.maintenance_forecast_interval_sec)
    while True:
        try:
            if settings.auto_maintenance_from_forecast:
                for site in demo_state.sites():
                    await maintenance_planner.handle_forecast_risk(int(site["id"]))
        except Exception:
            logger.exception("forecast maintenance loop failed")
        await asyncio.sleep(interval)


def start_forecast_scheduler() -> None:
    global _forecast_task
    if not settings.auto_maintenance_from_forecast:
        return
    if _forecast_task is not None and not _forecast_task.done():
        return
    _forecast_task = asyncio.create_task(_forecast_maintenance_loop())


def stop_forecast_scheduler() -> None:
    global _forecast_task
    if _forecast_task is not None:
        _forecast_task.cancel()
        _forecast_task = None
