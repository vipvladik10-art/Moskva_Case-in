"""Снятие дождя и пост-дождевые наряды."""

import pytest

from app.services.demo.scenario import end_rain, reset_demo, run_sudden_storm
from app.services.demo.state import demo_state


@pytest.fixture(autouse=True)
def _reset():
    reset_demo()
    yield
    reset_demo()


def test_end_rain_creates_post_rain_tasks():
    run_sudden_storm(rain_site_id=2)
    assert demo_state.rain_site_id() == 2

    result = end_rain()
    assert result["status"] == "ok"
    assert demo_state.rain_site_id() is None
    assert len(result["post_rain_tasks"]) >= 1

    phases = {t["phase"] for t in demo_state.maintenance()}
    assert "after_rain" in phases
    sweep = [t for t in demo_state.maintenance() if "щётк" in t.get("what", "").lower()]
    assert len(sweep) >= 1


def test_end_rain_noop_without_rain():
    result = end_rain()
    assert result["status"] == "noop"
