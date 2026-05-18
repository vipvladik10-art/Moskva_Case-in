"""Ключи идемпотентности нарядов ТО."""

from __future__ import annotations

ACTIVE_STATUSES = frozenset({"open", "in_progress"})


def make_dedup_key(
    *,
    site_id: int,
    phase: str,
    reason_code: str,
    machine_id: int | None = None,
) -> str:
    machine_part = str(machine_id) if machine_id is not None else "site"
    return f"{site_id}:{phase}:{reason_code}:{machine_part}"
