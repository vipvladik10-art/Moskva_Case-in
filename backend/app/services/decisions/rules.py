"""Справочник правил журнала решений (уровень B из плана).

Правила загружаются из JSON-фикстуры и могут обновляться через API без релиза кода.
"""

from __future__ import annotations

import copy
import json
from pathlib import Path
from typing import Any

from app.services.demo.state import FIXTURES_DIR, demo_state


def _rules_path() -> Path:
    return FIXTURES_DIR / "decision_rules.json"


def load_rules_from_file() -> list[dict[str, Any]]:
    path = _rules_path()
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def save_rules_to_file(rules: list[dict[str, Any]]) -> None:
    path = _rules_path()
    with path.open("w", encoding="utf-8") as f:
        json.dump(rules, f, ensure_ascii=False, indent=2)


def emit_decision(trigger: str, **context: Any) -> dict[str, Any] | None:
    """Найти правило по триггеру, сформировать сообщение и записать в журнал."""
    rules = demo_state.decision_rules()
    rule = next((r for r in rules if r.get("trigger") == trigger and r.get("enabled", True)), None)
    if rule is None:
        return None

    try:
        message = rule["message_template"].format(**context)
    except KeyError:
        message = rule["message_template"]

    kind = rule.get("kind", "system")
    extra = {k: v for k, v in context.items() if k not in ("site_name", "plate", "what", "phase_label")}
    return demo_state.log(kind, message, rule_id=rule["id"], trigger=trigger, **extra)
