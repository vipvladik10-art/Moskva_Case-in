"""Идемпотентность MaintenancePlanner."""

import pytest

from app.services.demo.scenario import reset_demo, run_sudden_storm
from app.services.demo.state import demo_state
from app.services.maintenance.planner import maintenance_planner
from app.services.maintenance.post_precip import schedule_post_rain_tasks


@pytest.fixture(autouse=True)
def _reset():
    reset_demo()
    yield
    reset_demo()


def test_demo_storm_idempotent():
    run_sudden_storm(rain_site_id=2)
    count_after_first = len(demo_state.maintenance())
    run_sudden_storm(rain_site_id=2)
    count_after_second = len(demo_state.maintenance())
    assert count_after_second == count_after_first


def test_rain_ended_idempotent():
    run_sudden_storm(rain_site_id=2)
    from app.services.demo.scenario import end_rain

    end_rain()
    count_first = len([t for t in demo_state.maintenance() if t.get("phase") == "after_rain"])
    schedule_post_rain_tasks(2)
    count_second = len([t for t in demo_state.maintenance() if t.get("phase") == "after_rain"])
    assert count_first == count_second
    assert count_first >= 1


def test_planner_sets_metadata():
    tasks = maintenance_planner.handle_demo_storm(2)
    assert len(tasks) >= 1
    task = tasks[0]
    assert task["trigger_source"] == "demo_storm"
    assert task["reason_code"] == "weather_idle"
    assert task["dedup_key"]
    assert task.get("decision_ids")
