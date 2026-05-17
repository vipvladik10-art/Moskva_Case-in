"""In-memory состояние демо-MVP.

Загружает фикстуры из `data/fixtures/*.json` и держит их в памяти процесса:
- участки, АБЗ, самосвалы;
- журнал решений системы;
- наряды ТО;
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


def _load_json(name: str) -> list[dict[str, Any]]:
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
        self._rain_site_id: int | None = None
        self.reset()

    def reset(self) -> None:
        with self._lock:
            self._plants = _load_json("plants.json")
            self._sites = _load_json("sites.json")
            self._trucks = [
                {
                    **t,
                    "status": "idle",
                    "destination_site_id": None,
                    "load_t": 0,
                    "current_geom": None,
                }
                for t in _load_json("trucks.json")
            ]
            self._maintenance = []
            self._decisions = []
            self._rain_site_id = None
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

    def decisions(self) -> list[dict[str, Any]]:
        with self._lock:
            return copy.deepcopy(self._decisions)

    def rain_site_id(self) -> int | None:
        with self._lock:
            return self._rain_site_id

    def set_rain_site(self, site_id: int | None) -> None:
        with self._lock:
            self._rain_site_id = site_id

    def update_truck(self, truck_id: int, **fields: Any) -> dict[str, Any] | None:
        with self._lock:
            for t in self._trucks:
                if t["id"] == truck_id:
                    t.update(fields)
                    return copy.deepcopy(t)
            return None

    def add_maintenance(self, machine_id: int, reason: str, assigned_to: str) -> dict[str, Any]:
        with self._lock:
            task = {
                "id": len(self._maintenance) + 1,
                "machine_id": machine_id,
                "reason": reason,
                "status": "open",
                "assigned_to": assigned_to,
                "created_at": datetime.now(tz=timezone.utc).isoformat(),
            }
            self._maintenance.append(task)
            return copy.deepcopy(task)

    def _log(self, kind: str, message: str, **extra: Any) -> dict[str, Any]:
        entry = {
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


demo_state = DemoState()
