"""Сценарии демо: внезапный дождь и сброс.

Бизнес-логика:
- маркируем выбранный участок как «идёт дождь»;
- находим самосвалы, направленные на этот участок (или загружаем 2 машины с АБЗ участка);
- перенаправляем их на ближайший сухой участок;
- создаём наряды ТО на простаивающие машины;
- формируем заявку на подвоз тех. смесей при необходимости.

Все вычисления — на in-memory demo_state, без БД.
"""

from __future__ import annotations

from typing import Any

from app.services.algorithms.geo import haversine_km
from app.services.demo.state import demo_state


def _nearest_dry_site(rain_site_id: int) -> dict[str, Any] | None:
    rain_site = demo_state.site(rain_site_id)
    if not rain_site:
        return None
    candidates = [
        s for s in demo_state.sites()
        if s["id"] != rain_site_id and s["weather_state"] != "rain"
    ]
    if not candidates:
        return None
    # Для показательного дорожного сценария сначала пробуем перебросить смесь
    # вперёд по трассе, а не назад. Если впереди сухих участков нет — берём
    # ближайший в любом направлении.
    forward = [s for s in candidates if s["id"] > rain_site_id]
    if forward:
        return min(forward, key=lambda s: s["id"])
    rain_lat = rain_site["location"]["lat"]
    rain_lon = rain_site["location"]["lon"]
    candidates.sort(
        key=lambda s: haversine_km(rain_lat, rain_lon, s["location"]["lat"], s["location"]["lon"])
    )
    return candidates[0]


def _trucks_for_site(site_id: int, target_count: int = 3) -> list[dict[str, Any]]:
    """Берём самосвалы, направленные на участок; добавляем простаивающие при нехватке."""
    trucks = demo_state.trucks()
    en_route = [t for t in trucks if t.get("destination_site_id") == site_id]
    if len(en_route) >= target_count:
        return en_route[:target_count]
    site = demo_state.site(site_id)
    plant_id = site["preferred_plant_id"] if site else None
    idle = [
        t for t in trucks
        if t["id"] not in {x["id"] for x in en_route}
        and (plant_id is None or t.get("home_plant_id") == plant_id)
        and t["status"] in ("idle", "loading")
    ]
    return (en_route + idle)[:target_count]


def run_sudden_storm(rain_site_id: int = 2, redirect_count: int = 3) -> dict[str, Any]:
    """Главный демо-сценарий: внезапный дождь на участке."""
    rain_site = demo_state.site(rain_site_id)
    if not rain_site:
        raise ValueError(f"Site {rain_site_id} not found")

    demo_state.set_rain_site(rain_site_id)
    demo_state.log("weather", f"Закрыто зелёное окно на участке «{rain_site['name']}»", site_id=rain_site_id)

    target = _nearest_dry_site(rain_site_id)
    redirected: list[dict[str, Any]] = []
    if target:
        for truck in _trucks_for_site(rain_site_id, redirect_count):
            updated = demo_state.update_truck(
                truck["id"],
                status="en_route",
                destination_site_id=target["id"],
                load_t=truck.get("load_t") or 12.0,
            )
            if not updated:
                continue
            redirected.append(updated)
            demo_state.log(
                "redirect",
                f"Самосвал {updated['plate']} перенаправлен на «{target['name']}»",
                truck_id=updated["id"],
                from_site_id=rain_site_id,
                to_site_id=target["id"],
            )

    maintenance_tasks: list[dict[str, Any]] = []
    idle_trucks = [t for t in demo_state.trucks() if t["status"] == "idle"][:2]
    for t in idle_trucks:
        task = demo_state.add_maintenance(
            machine_id=t["id"],
            reason="weather_idle: непогода — окно для ТО",
            assigned_to="Бригада №2 (Петров А.Н.)",
        )
        maintenance_tasks.append(task)
        demo_state.log(
            "maintenance",
            f"Создан наряд ТО для машины {t['plate']}",
            task_id=task["id"],
            machine_id=t["id"],
        )

    if target:
        explanation = (
            f"На участке «{rain_site['name']}» закрыто зелёное окно из-за осадков. "
            f"{len(redirected)} самосвал(ов) перенаправлены на ближайший сухой участок "
            f"«{target['name']}». Создано {len(maintenance_tasks)} наряда(ов) ТО."
        )
    else:
        explanation = (
            f"На участке «{rain_site['name']}» закрыто зелёное окно из-за осадков. "
            f"Сухих участков в зоне досягаемости нет — рекомендуется приостановить отгрузку."
        )

    return {
        "rain_site_id": rain_site_id,
        "rain_site_name": rain_site["name"],
        "target_site_id": target["id"] if target else None,
        "target_site_name": target["name"] if target else None,
        "redirected_trucks": redirected,
        "maintenance_tasks": maintenance_tasks,
        "explanation": explanation,
    }


def reset_demo() -> dict[str, str]:
    demo_state.reset()
    return {"status": "ok", "message": "Демо-состояние сброшено к исходному"}
