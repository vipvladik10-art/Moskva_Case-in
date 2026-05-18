"""CRUD участков, АБЗ и пользовательских меток."""

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.services.demo.scenario import reset_demo
from tests.conftest import ADMIN_HEADERS

client = TestClient(app)


@pytest.fixture(autouse=True)
def _reset(monkeypatch):
    monkeypatch.setattr(settings, "auth_enabled", True)
    reset_demo()
    yield
    reset_demo()


def test_site_crud():
    created = client.post(
        "/api/v1/sites",
        json={"name": "Тест участок", "location": {"lat": 56.95, "lon": 35.9}},
        headers=ADMIN_HEADERS,
    )
    assert created.status_code == 200
    site_id = created.json()["id"]

    updated = client.patch(
        f"/api/v1/sites/{site_id}",
        json={"name": "Тест переименован"},
        headers=ADMIN_HEADERS,
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "Тест переименован"

    deleted = client.delete(f"/api/v1/sites/{site_id}", headers=ADMIN_HEADERS)
    assert deleted.status_code == 200
    assert client.get(f"/api/v1/sites/{site_id}").status_code == 404


def test_plant_crud():
    created = client.post(
        "/api/v1/plants",
        json={"name": "АБЗ Тест", "location": {"lat": 56.0, "lon": 37.0}},
        headers=ADMIN_HEADERS,
    )
    assert created.status_code == 200
    plant_id = created.json()["id"]

    updated = client.patch(
        f"/api/v1/plants/{plant_id}",
        json={"capacity_t_per_hour": 99},
        headers=ADMIN_HEADERS,
    )
    assert updated.status_code == 200
    assert updated.json()["capacity_t_per_hour"] == 99

    assert client.delete(f"/api/v1/plants/{plant_id}", headers=ADMIN_HEADERS).status_code == 200


def test_map_marker_crud():
    created = client.post(
        "/api/v1/map-markers",
        json={"name": "Склад", "lat": 56.91, "lon": 37.41, "notes": "временный"},
        headers=ADMIN_HEADERS,
    )
    assert created.status_code == 200
    marker_id = created.json()["id"]

    listed = client.get("/api/v1/map-markers")
    assert any(m["id"] == marker_id for m in listed.json())

    updated = client.patch(
        f"/api/v1/map-markers/{marker_id}",
        json={"name": "Склад 2"},
        headers=ADMIN_HEADERS,
    )
    assert updated.json()["name"] == "Склад 2"

    assert client.delete(f"/api/v1/map-markers/{marker_id}", headers=ADMIN_HEADERS).status_code == 200
