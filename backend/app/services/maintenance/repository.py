"""Абстракция хранилища нарядов ТО."""

from __future__ import annotations

from typing import Any, Protocol


class MaintenanceRepository(Protocol):
    def find_active_by_dedup_key(self, dedup_key: str) -> dict[str, Any] | None: ...

    def create(self, payload: dict[str, Any]) -> dict[str, Any]: ...

    def update_status(self, task_id: int, status: str) -> dict[str, Any] | None: ...

    def get(self, task_id: int) -> dict[str, Any] | None: ...

    def list(
        self,
        *,
        status: str | None = None,
        site_id: int | None = None,
        phase: str | None = None,
        trigger_source: str | None = None,
    ) -> list[dict[str, Any]]: ...
