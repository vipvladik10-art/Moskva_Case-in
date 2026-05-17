"""Сценарий внезапного дождя на demo_state."""

import pytest

from app.services.demo.scenario import reset_demo, run_sudden_storm
from app.services.demo.state import demo_state


@pytest.fixture(autouse=True)
def _reset():
    reset_demo()
    yield
    reset_demo()


def test_sudden_storm_marks_site_and_redirects_trucks():
    result = run_sudden_storm(rain_site_id=2, redirect_count=3)

    assert result["rain_site_id"] == 2
    assert result["target_site_id"] != 2
    assert result["target_site_id"] == 3
    assert demo_state.rain_site_id() == 2

    assert 1 <= len(result["redirected_trucks"]) <= 3
    for t in result["redirected_trucks"]:
        assert t["destination_site_id"] == result["target_site_id"]
        assert t["status"] == "en_route"


def test_sudden_storm_creates_maintenance_tasks():
    result = run_sudden_storm(rain_site_id=2)
    assert len(result["maintenance_tasks"]) >= 1
    for task in result["maintenance_tasks"]:
        assert task["status"] == "open"


def test_sudden_storm_logs_decisions():
    run_sudden_storm(rain_site_id=2)
    decisions = demo_state.decisions()
    kinds = {d["kind"] for d in decisions}
    assert "weather" in kinds
    assert "redirect" in kinds
    assert "maintenance" in kinds


def test_reset_clears_state():
    run_sudden_storm(rain_site_id=2)
    reset_demo()
    assert demo_state.rain_site_id() is None
    assert demo_state.maintenance() == []
    en_route = [t for t in demo_state.trucks() if t["status"] == "en_route"]
    assert en_route == []
