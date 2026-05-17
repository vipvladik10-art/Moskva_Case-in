"""Триггер планирования ТО при погодном риске.

См. docs/algorithms.md §6. Ответственный: P1, требования: E1.
"""

from __future__ import annotations

from app.core.config import settings
from app.services.demo.state import demo_state
from app.services.weather.service import get_site_forecast

WEATHER_RISK_REASON = "weather_risk: прогноз осадков — окно для ТО"


def _already_has_weather_task(machine_id: int) -> bool:
    return any(
        task["machine_id"] == machine_id
        and task["status"] == "open"
        and str(task["reason"]).startswith("weather_risk:")
        for task in demo_state.maintenance()
    )


async def schedule_maintenance_for_idle_machines(site_id: int) -> list[int]:
    """Создать ТО-наряды для простаивающей техники, если прогноз даёт риск осадков."""
    site = demo_state.site(site_id)
    if not site:
        return []

    forecast = await get_site_forecast(
        site_id=site_id,
        lat=site["location"]["lat"],
        lon=site["location"]["lon"],
        hours=12,
    )
    max_pop = max((float(h.precip_probability) for h in forecast), default=0.0)
    max_precip = max((float(h.precip_mm_h) for h in forecast), default=0.0)
    if max_pop < settings.green_window_precip_threshold and max_precip <= 0.1:
        return []

    idle_trucks = [
        truck
        for truck in demo_state.trucks()
        if truck["status"] == "idle" and not _already_has_weather_task(truck["id"])
    ][:2]

    task_ids: list[int] = []
    for truck in idle_trucks:
        task = demo_state.add_maintenance(
            machine_id=truck["id"],
            reason=WEATHER_RISK_REASON,
            assigned_to="Бригада №2 (Петров А.Н.)",
        )
        task_ids.append(task["id"])
        demo_state.log(
            "maintenance",
            f"Погодный риск на участке «{site['name']}»: создан наряд ТО для машины {truck['plate']}",
            site_id=site_id,
            task_id=task["id"],
            machine_id=truck["id"],
        )

    if task_ids:
        demo_state.log(
            "weather",
            (
                f"Прогнозный риск осадков на участке «{site['name']}»: "
                f"POP={max_pop:.0%}, интенсивность={max_precip:.1f} мм/ч"
            ),
            site_id=site_id,
        )

    return task_ids
