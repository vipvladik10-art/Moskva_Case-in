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
from app.services.decisions.rules import emit_decision
from app.services.demo.state import demo_state
from app.services.maintenance.planner import maintenance_planner
from app.services.maintenance.post_precip import schedule_post_rain_tasks


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
        t
        for t in trucks
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
    emit_decision("weather.rain_started", site_name=rain_site["name"], site_id=rain_site_id)

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
            emit_decision(
                "logistics.truck_redirected",
                plate=updated["plate"],
                from_site_name=rain_site["name"],
                to_site_name=target["name"],
                truck_id=updated["id"],
                from_site_id=rain_site_id,
                to_site_id=target["id"],
            )

    idle_ids = [t["id"] for t in demo_state.trucks() if t["status"] == "idle"][:2]
    maintenance_tasks = maintenance_planner.handle_demo_storm(rain_site_id, truck_ids=idle_ids)

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


def end_rain() -> dict[str, Any]:
    """Снять демо-дождь и создать наряды на работы после осадков."""
    site_id = demo_state.clear_rain_site()
    if site_id is None:
        site_id = demo_state.last_rain_site_id()
    if site_id is None:
        return {
            "status": "noop",
            "message": "Активный дождь не зафиксирован",
            "post_rain_tasks": [],
        }

    site = demo_state.site(site_id)
    post_tasks = schedule_post_rain_tasks(site_id)
    site_name = site["name"] if site else f"№{site_id}"
    return {
        "status": "ok",
        "site_id": site_id,
        "site_name": site_name,
        "message": f"Дождь на «{site_name}» снят, создано {len(post_tasks)} наряда(ов) после осадков",
        "post_rain_tasks": post_tasks,
    }


def reset_demo() -> dict[str, str]:
    demo_state.reset()
    return {"status": "ok", "message": "Демо-состояние сброшено к исходному"}
