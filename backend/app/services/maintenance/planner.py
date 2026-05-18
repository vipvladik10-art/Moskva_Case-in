"""Единый планировщик нарядов ТО."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.core.config import settings
from app.services.decisions.rules import emit_decision
from app.services.demo.state import FIXTURES_DIR, demo_state
from app.services.maintenance.dedup import make_dedup_key
from app.services.maintenance.demo_repository import maintenance_repository
from app.services.maintenance.repository import MaintenanceRepository
from app.services.maintenance.task_builder import _crew_label
from app.services.weather.service import get_site_forecast

WEATHER_RISK_REASON = "weather_risk: прогноз осадков — окно для ТО"
WEATHER_IDLE_REASON = "weather_idle: непогода — окно для ТО"


def _procedures() -> list[dict[str, Any]]:
    path = FIXTURES_DIR / "post_rain_procedures.json"
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _emit_decisions(trigger: str, context: dict[str, Any]) -> tuple[list[int], str | None]:
    entry = emit_decision(trigger, **context)
    if not entry:
        return [], None
    ids: list[int] = []
    if entry.get("id") is not None:
        ids.append(int(entry["id"]))
    rule_id = entry.get("rule_id")
    return ids, str(rule_id) if rule_id else None


def _create_task(
    repo: MaintenanceRepository,
    *,
    site: dict[str, Any],
    machine_id: int | None,
    phase: str,
    reason: str,
    reason_code: str,
    trigger_source: str,
    what: str,
    why: str,
    crew_instructions: str,
    equipment: list[str],
    priority: str = "normal",
) -> dict[str, Any] | None:
    site_id = int(site["id"])
    dedup_key = make_dedup_key(
        site_id=site_id,
        phase=phase,
        reason_code=reason_code,
        machine_id=machine_id,
    )
    if repo.find_active_by_dedup_key(dedup_key):
        return None

    return repo.create(
        {
            "machine_id": machine_id,
            "site_id": site_id,
            "destination": site["name"],
            "what": what,
            "why": why,
            "crew_instructions": crew_instructions,
            "equipment": equipment,
            "phase": phase,
            "reason": reason,
            "reason_code": reason_code,
            "trigger_source": trigger_source,
            "dedup_key": dedup_key,
            "decision_ids": [],
            "rule_id": None,
            "created_by": "system",
            "assigned_to": _crew_label(),
            "priority": priority,
            "status": "open",
        }
    )


def _attach_decisions(task: dict[str, Any], triggers: list[tuple[str, dict[str, Any]]]) -> dict[str, Any]:
    site_id = task.get("site_id")
    site = demo_state.site(int(site_id)) if site_id else None
    site_name = site["name"] if site else ""
    decision_ids = list(task.get("decision_ids") or [])
    rule_id = task.get("rule_id")
    for trigger, ctx in triggers:
        full_ctx = {
            **ctx,
            "site_id": site_id,
            "site_name": site_name,
            "task_id": task["id"],
        }
        ids, rid = _emit_decisions(trigger, full_ctx)
        for did in ids:
            if did not in decision_ids:
                decision_ids.append(did)
        if rid and not rule_id:
            rule_id = rid
    demo_state.update_maintenance(
        int(task["id"]),
        decision_ids=decision_ids,
        rule_id=rule_id,
    )
    updated = demo_state.maintenance_task(int(task["id"]))
    return updated or task


class MaintenancePlanner:
    def __init__(self, repo: MaintenanceRepository | None = None) -> None:
        self._repo = repo or maintenance_repository

    async def handle_forecast_risk(self, site_id: int) -> list[dict[str, Any]]:
        if not settings.auto_maintenance_from_forecast:
            return []

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

        idle_trucks = [t for t in demo_state.trucks() if t["status"] == "idle"][:2]
        created: list[dict[str, Any]] = []
        for truck in idle_trucks:
            task = _create_task(
                self._repo,
                site=site,
                machine_id=truck["id"],
                phase="during_rain",
                reason=WEATHER_RISK_REASON,
                reason_code="weather_risk",
                trigger_source="forecast_risk",
                what="Периодический осмотр и ТО простаивающей техники",
                why="Прогноз осадков закрывает окно укладки — использовать простой для регламентных работ",
                crew_instructions=(
                    "Помимо машин: проверить узлы смазки, фильтры, гидравлику; "
                    "мастер — журнал ТО; рабочие 3–4 разряда — уборка кабин и площадки стоянки"
                ),
                equipment=["Набор инструмента", "Смазочные материалы"],
            )
            if not task:
                continue
            task = _attach_decisions(
                task,
                [
                    (
                        "maintenance.weather_idle_created",
                        {"plate": truck["plate"], "phase_label": "по прогнозу", "machine_id": truck["id"]},
                    ),
                ],
            )
            created.append(task)

        if created:
            _emit_decisions(
                "weather.forecast_risk",
                {
                    "site_name": site["name"],
                    "site_id": site_id,
                    "pop_pct": int(max_pop * 100),
                    "precip_mm": f"{max_precip:.1f}",
                },
            )

        return created

    def handle_demo_storm(self, site_id: int, truck_ids: list[int] | None = None) -> list[dict[str, Any]]:
        site = demo_state.site(site_id)
        if not site:
            return []

        trucks = demo_state.trucks()
        if truck_ids is not None:
            targets = [t for t in trucks if t["id"] in truck_ids and t["status"] == "idle"]
        else:
            targets = [t for t in trucks if t["status"] == "idle"][:2]

        created: list[dict[str, Any]] = []
        for truck in targets:
            task = _create_task(
                self._repo,
                site=site,
                machine_id=truck["id"],
                phase="during_rain",
                reason=WEATHER_IDLE_REASON,
                reason_code="weather_idle",
                trigger_source="demo_storm",
                what="Периодический осмотр и ТО простаивающей техники",
                why="Непогода закрыла окно укладки — использовать простой для регламентных работ",
                crew_instructions=(
                    "Помимо машин: проверить узлы смазки, фильтры, гидравлику; "
                    "мастер — журнал ТО; рабочие 3–4 разряда — уборка кабин и площадки стоянки"
                ),
                equipment=["Набор инструмента", "Смазочные материалы"],
            )
            if not task:
                continue
            task = _attach_decisions(
                task,
                [
                    (
                        "maintenance.weather_idle_created",
                        {
                            "plate": truck["plate"],
                            "phase_label": "во время дождя",
                            "machine_id": truck["id"],
                        },
                    ),
                ],
            )
            created.append(task)
        return created

    def handle_rain_ended(self, site_id: int) -> list[dict[str, Any]]:
        site = demo_state.site(site_id)
        if not site:
            return []

        created: list[dict[str, Any]] = []
        for proc in _procedures():
            reason_code = f"post_rain:{proc['id']}"
            task = _create_task(
                self._repo,
                site=site,
                machine_id=None,
                phase="after_rain",
                reason=reason_code,
                reason_code=reason_code,
                trigger_source="rain_ended",
                what=proc["what"],
                why=proc["why"],
                crew_instructions=proc["crew_instructions"],
                equipment=list(proc.get("equipment", [])),
                priority=proc.get("priority", "normal"),
            )
            if not task:
                continue
            task = _attach_decisions(
                task,
                [("maintenance.post_rain_created", {"what": proc["what"]})],
            )
            created.append(task)

        if created:
            _emit_decisions("weather.rain_ended", {"site_name": site["name"], "site_id": site_id})

        return created


maintenance_planner = MaintenancePlanner()
