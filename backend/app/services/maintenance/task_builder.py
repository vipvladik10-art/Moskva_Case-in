"""Сборка структурированных нарядов ТО (legacy helpers; создание через planner)."""

from __future__ import annotations

from app.services.demo.state import demo_state


def _crew_label() -> str:
    workers = demo_state.fleet().get("workers", [])
    grades = sorted({w["grade"] for w in workers if w.get("grade")}, reverse=True)
    if grades:
        return f"Бригада (разряды {', '.join(str(g) for g in grades[:3])})"
    return "Бригада №2"
