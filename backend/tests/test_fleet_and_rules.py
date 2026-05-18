"""Справочник парка и правил решений."""

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.services.demo.scenario import reset_demo
from app.services.demo.state import demo_state
from tests.conftest import ADMIN_HEADERS

client = TestClient(app)


@pytest.fixture(autouse=True)
def _reset(monkeypatch):
    monkeypatch.setattr(settings, "auth_enabled", True)
    reset_demo()
    yield
    reset_demo()


def test_get_fleet_has_vehicles_and_workers():
    r = client.get("/api/v1/fleet")
    assert r.status_code == 200
    data = r.json()
    assert len(data["vehicles"]) >= 1
    assert len(data["workers"]) >= 1


def test_put_fleet_updates_catalog():
    payload = {
        "vehicles": [{"id": 99, "category": "truck", "name": "Test", "plate": "T-99"}],
        "workers": [{"grade": 4, "role": "тест", "count": 1}],
    }
    r = client.put("/api/v1/fleet", json=payload, headers=ADMIN_HEADERS)
    assert r.status_code == 200
    assert client.get("/api/v1/fleet").json()["vehicles"][0]["plate"] == "T-99"


def test_decision_rules_list_and_update():
    r = client.get("/api/v1/decision-rules")
    assert r.status_code == 200
    rules = r.json()
    assert any(rule["trigger"] == "weather.rain_started" for rule in rules)

    target_id = rules[0]["id"]
    updated = [
        {**rule, "enabled": False if rule["id"] == target_id else rule.get("enabled", True)}
        for rule in rules
    ]
    r2 = client.put("/api/v1/decision-rules", json={"rules": updated}, headers=ADMIN_HEADERS)
    assert r2.status_code == 200
    disabled = next(rule for rule in r2.json() if rule["id"] == target_id)
    assert disabled["enabled"] is False

    # Восстановить in-memory и не портить фикстуру на диске для других тестов
    restored = [
        {**rule, "enabled": True if rule["id"] == target_id else rule.get("enabled", True)}
        for rule in rules
    ]
    demo_state.update_decision_rules(restored)
