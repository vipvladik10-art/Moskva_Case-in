"""In-memory состояние демо-MVP.

Загружает фикстуры из `data/fixtures/*.json` и держит их в памяти процесса:
- участки, АБЗ, самосвалы;
- журнал решений системы;
- наряды ТО;
- парк техники и штат по разрядам;
- справочник правил решений;
- мутируемый «фокус дождя» (site_id, где идёт дождь).

Используется всеми API-эндпоинтами вместо БД до конца хакатона.
"""

from __future__ import annotations

import copy
import json
from datetime import datetime, timezone
from pathlib import Path
from threading import RLock
from typing import Any


def _fixtures_dir() -> Path:
    backend_root = Path(__file__).resolve().parents[3]
    repo_fixtures = backend_root.parent / "data" / "fixtures"
    if repo_fixtures.exists():
        return repo_fixtures
    mounted_fixtures = Path("/repo-data/fixtures")
    if mounted_fixtures.exists():
        return mounted_fixtures
    return backend_root / "data" / "fixtures"


FIXTURES_DIR = _fixtures_dir()


def _load_json(name: str) -> list[dict[str, Any]] | dict[str, Any]:
    path = FIXTURES_DIR / name
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


class DemoState:
    """Потокобезопасное in-memory хранилище демо-состояния."""

    def __init__(self) -> None:
        self._lock = RLock()
        self._plants: list[dict[str, Any]] = []
        self._sites: list[dict[str, Any]] = []
        self._trucks: list[dict[str, Any]] = []
        self._maintenance: list[dict[str, Any]] = []
        self._decisions: list[dict[str, Any]] = []
        self._fleet: dict[str, Any] = {"vehicles": [], "workers": []}
        self._decision_rules: list[dict[str, Any]] = []
        self._map_markers: list[dict[str, Any]] = []
        self._rain_site_id: int | None = None
        self._last_rain_site_id: int | None = None
        self.reset()

    def reset(self) -> None:
        with self._lock:
            self._plants = _load_json("plants.json")  # type: ignore[assignment]
            self._sites = _load_json("sites.json")  # type: ignore[assignment]
            self._trucks = [
                {
                    **t,
                    "status": "idle",
                    "destination_site_id": None,
                    "load_t": 0,
                    "current_geom": None,
                }
                for t in _load_json("trucks.json")  # type: ignore[union-attr]
            ]
            self._maintenance = []
            self._decisions = []
            self._fleet = copy.deepcopy(_load_json("fleet.json"))  # type: ignore[assignment]
            self._decision_rules = copy.deepcopy(_load_json("decision_rules.json"))  # type: ignore[assignment]
            markers_path = FIXTURES_DIR / "map_markers.json"
            if markers_path.exists():
                self._map_markers = copy.deepcopy(_load_json("map_markers.json"))  # type: ignore[assignment]
            else:
                self._map_markers = []
            self._rain_site_id = None
            self._last_rain_site_id = None
            self._log("system", "Демо-состояние инициализировано")

    def plants(self) -> list[dict[str, Any]]:
        with self._lock:
            return copy.deepcopy(self._plants)

    def sites(self) -> list[dict[str, Any]]:
        with self._lock:
            return [self._enriched_site(s) for s in self._sites]

    def site(self, site_id: int) -> dict[str, Any] | None:
        with self._lock:
            for s in self._sites:
                if s["id"] == site_id:
                    return self._enriched_site(s)
            return None

    def plant(self, plant_id: int) -> dict[str, Any] | None:
        with self._lock:
            for p in self._plants:
                if p["id"] == plant_id:
                    return copy.deepcopy(p)
            return None

    def trucks(self) -> list[dict[str, Any]]:
        with self._lock:
            return copy.deepcopy(self._trucks)

    def maintenance(self) -> list[dict[str, Any]]:
        with self._lock:
            return copy.deepcopy(self._maintenance)

    def maintenance_task(self, task_id: int) -> dict[str, Any] | None:
        with self._lock:
            for task in self._maintenance:
                if task["id"] == task_id:
                    return copy.deepcopy(task)
            return None

    def decisions(self) -> list[dict[str, Any]]:
        with self._lock:
            return copy.deepcopy(self._decisions)

    def fleet(self) -> dict[str, Any]:
        with self._lock:
            return copy.deepcopy(self._fleet)

    def update_fleet(self, fleet: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            vehicles = fleet.get("vehicles")
            workers = fleet.get("workers")
            if not isinstance(vehicles, list) or not isinstance(workers, list):
                raise ValueError("fleet must contain vehicles[] and workers[]")
            self._fleet = {"vehicles": copy.deepcopy(vehicles), "workers": copy.deepcopy(workers)}
            self._log("system", "Справочник парка и штата обновлён")
            return copy.deepcopy(self._fleet)

    def decision_rules(self) -> list[dict[str, Any]]:
        with self._lock:
            return copy.deepcopy(self._decision_rules)

    def update_decision_rules(self, rules: list[dict[str, Any]]) -> list[dict[str, Any]]:
        with self._lock:
            self._decision_rules = copy.deepcopy(rules)
            self._log("system", f"Справочник правил решений обновлён ({len(rules)} шт.)")
            return copy.deepcopy(self._decision_rules)

    def rain_site_id(self) -> int | None:
        with self._lock:
            return self._rain_site_id

    def set_rain_site(self, site_id: int | None) -> None:
        with self._lock:
            self._rain_site_id = site_id
            if site_id is not None:
                self._last_rain_site_id = site_id

    def clear_rain_site(self) -> int | None:
        """Снять демо-дождь; вернуть id участка, где он был."""
        with self._lock:
            prev = self._rain_site_id
            self._rain_site_id = None
            return prev

    def last_rain_site_id(self) -> int | None:
        with self._lock:
            return self._last_rain_site_id

    def update_truck(self, truck_id: int, **fields: Any) -> dict[str, Any] | None:
        with self._lock:
            for t in self._trucks:
                if t["id"] == truck_id:
                    t.update(fields)
                    return copy.deepcopy(t)
            return None

    def add_maintenance(
        self,
        *,
        machine_id: int | None = None,
        site_id: int | None = None,
        destination: str = "",
        what: str = "",
        why: str = "",
        crew_instructions: str = "",
        equipment: list[str] | str | None = None,
        phase: str = "during_rain",
        reason: str,
        reason_code: str = "",
        trigger_source: str = "",
        dedup_key: str = "",
        decision_ids: list[int] | None = None,
        rule_id: str | None = None,
        created_by: str = "system",
        assigned_to: str,
        priority: str = "normal",
        status: str = "open",
    ) -> dict[str, Any]:
        with self._lock:
            if isinstance(equipment, str):
                equip: list[str] = [equipment] if equipment else []
            else:
                equip = list(equipment or [])
            now = datetime.now(tz=timezone.utc).isoformat()
            task = {
                "id": len(self._maintenance) + 1,
                "machine_id": machine_id,
                "site_id": site_id,
                "destination": destination,
                "what": what,
                "why": why,
                "crew_instructions": crew_instructions,
                "equipment": equip,
                "phase": phase,
                "reason": reason,
                "reason_code": reason_code,
                "trigger_source": trigger_source,
                "dedup_key": dedup_key,
                "decision_ids": list(decision_ids or []),
                "rule_id": rule_id,
                "created_by": created_by,
                "status": status,
                "assigned_to": assigned_to,
                "priority": priority,
                "created_at": now,
                "updated_at": now,
            }
            self._maintenance.append(task)
            return copy.deepcopy(task)

    def update_maintenance(self, task_id: int, **fields: Any) -> dict[str, Any] | None:
        with self._lock:
            for task in self._maintenance:
                if task["id"] != task_id:
                    continue
                task.update(fields)
                task["updated_at"] = datetime.now(tz=timezone.utc).isoformat()
                return copy.deepcopy(task)
            return None

    def _log(self, kind: str, message: str, **extra: Any) -> dict[str, Any]:
        entry = {
            "id": len(self._decisions) + 1,
            "at": datetime.now(tz=timezone.utc).isoformat(),
            "kind": kind,
            "message": message,
            **extra,
        }
        self._decisions.append(entry)
        return entry

    def log(self, kind: str, message: str, **extra: Any) -> dict[str, Any]:
        with self._lock:
            return copy.deepcopy(self._log(kind, message, **extra))

    def _enriched_site(self, site: dict[str, Any]) -> dict[str, Any]:
        s = copy.deepcopy(site)
        s["weather_state"] = "rain" if self._rain_site_id == s["id"] else "clear"
        return s

    def map_markers(self) -> list[dict[str, Any]]:
        with self._lock:
            return copy.deepcopy(self._map_markers)

    @staticmethod
    def _next_id(items: list[dict[str, Any]]) -> int:
        return max((int(x["id"]) for x in items), default=0) + 1

    @staticmethod
    def _default_site_geometry(lon: float, lat: float, delta: float = 0.002) -> dict[str, Any]:
        return {
            "type": "LineString",
            "coordinates": [[lon - delta, lat], [lon + delta, lat]],
        }

    @staticmethod
    def _location_from_geometry(
        geometry: dict[str, Any] | None, lon: float, lat: float
    ) -> dict[str, float]:
        if geometry and geometry.get("coordinates"):
            coords = geometry["coordinates"]
            if geometry.get("type") == "LineString" and coords:
                mid = coords[len(coords) // 2]
                return {"lon": float(mid[0]), "lat": float(mid[1])}
        return {"lon": lon, "lat": lat}

    def add_site(self, payload: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            lon = float(payload["location"]["lon"])
            lat = float(payload["location"]["lat"])
            geometry = payload.get("geometry") or self._default_site_geometry(lon, lat)
            location = self._location_from_geometry(geometry, lon, lat)
            new_id = self._next_id(self._sites)
            site = {
                "id": new_id,
                "name": payload.get("name") or f"Участок {new_id}",
                "location": location,
                "geometry": geometry,
                "lane_width_m": float(payload.get("lane_width_m", 4.0)),
                "layer_thickness_m": float(payload.get("layer_thickness_m", 0.05)),
                "mix_density_t_m3": float(payload.get("mix_density_t_m3", 2.4)),
                "mix_type": payload.get("mix_type", "ЩМА-15"),
                "thin_layer": bool(payload.get("thin_layer", False)),
                "preferred_plant_id": payload.get("preferred_plant_id"),
            }
            self._sites.append(site)
            self._log("system", f"Добавлен участок «{site['name']}»", site_id=site["id"])
            return self._enriched_site(site)

    def update_site(self, site_id: int, payload: dict[str, Any]) -> dict[str, Any] | None:
        with self._lock:
            for site in self._sites:
                if site["id"] != site_id:
                    continue
                if "name" in payload:
                    site["name"] = payload["name"]
                if "geometry" in payload:
                    site["geometry"] = payload["geometry"]
                if "location" in payload:
                    site["location"] = {
                        "lat": float(payload["location"]["lat"]),
                        "lon": float(payload["location"]["lon"]),
                    }
                elif "geometry" in payload:
                    loc = self._location_from_geometry(
                        site.get("geometry"),
                        float(site["location"]["lon"]),
                        float(site["location"]["lat"]),
                    )
                    site["location"] = loc
                for key in (
                    "lane_width_m",
                    "layer_thickness_m",
                    "mix_density_t_m3",
                    "mix_type",
                    "thin_layer",
                    "preferred_plant_id",
                ):
                    if key in payload:
                        site[key] = payload[key]
                return self._enriched_site(site)
            return None

    def delete_site(self, site_id: int) -> bool:
        with self._lock:
            before = len(self._sites)
            self._sites = [s for s in self._sites if s["id"] != site_id]
            if self._rain_site_id == site_id:
                self._rain_site_id = None
            if len(self._sites) < before:
                self._log("system", f"Удалён участок №{site_id}", site_id=site_id)
                return True
            return False

    def add_plant(self, payload: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            new_id = self._next_id(self._plants)
            plant = {
                "id": new_id,
                "name": payload.get("name") or f"АБЗ-{new_id}",
                "location": {
                    "lat": float(payload["location"]["lat"]),
                    "lon": float(payload["location"]["lon"]),
                },
                "capacity_t_per_hour": int(payload.get("capacity_t_per_hour", 60)),
                "active": bool(payload.get("active", True)),
            }
            self._plants.append(plant)
            self._log("system", f"Добавлен АБЗ «{plant['name']}»", plant_id=plant["id"])
            return copy.deepcopy(plant)

    def update_plant(self, plant_id: int, payload: dict[str, Any]) -> dict[str, Any] | None:
        with self._lock:
            for plant in self._plants:
                if plant["id"] != plant_id:
                    continue
                if "name" in payload:
                    plant["name"] = payload["name"]
                if "location" in payload:
                    plant["location"] = {
                        "lat": float(payload["location"]["lat"]),
                        "lon": float(payload["location"]["lon"]),
                    }
                if "capacity_t_per_hour" in payload:
                    plant["capacity_t_per_hour"] = int(payload["capacity_t_per_hour"])
                if "active" in payload:
                    plant["active"] = bool(payload["active"])
                return copy.deepcopy(plant)
            return None

    def delete_plant(self, plant_id: int) -> bool:
        with self._lock:
            before = len(self._plants)
            self._plants = [p for p in self._plants if p["id"] != plant_id]
            if len(self._plants) < before:
                self._log("system", f"Удалён АБЗ №{plant_id}", plant_id=plant_id)
                return True
            return False

    def add_map_marker(self, payload: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            marker = {
                "id": self._next_id(self._map_markers),
                "name": payload.get("name") or "Метка",
                "lat": float(payload["lat"]),
                "lon": float(payload["lon"]),
                "notes": payload.get("notes") or "",
            }
            self._map_markers.append(marker)
            return copy.deepcopy(marker)

    def update_map_marker(self, marker_id: int, payload: dict[str, Any]) -> dict[str, Any] | None:
        with self._lock:
            for marker in self._map_markers:
                if marker["id"] != marker_id:
                    continue
                if "name" in payload:
                    marker["name"] = payload["name"]
                if "lat" in payload:
                    marker["lat"] = float(payload["lat"])
                if "lon" in payload:
                    marker["lon"] = float(payload["lon"])
                if "notes" in payload:
                    marker["notes"] = payload["notes"]
                return copy.deepcopy(marker)
            return None

    def delete_map_marker(self, marker_id: int) -> bool:
        with self._lock:
            before = len(self._map_markers)
            self._map_markers = [m for m in self._map_markers if m["id"] != marker_id]
            return len(self._map_markers) < before


demo_state = DemoState()
