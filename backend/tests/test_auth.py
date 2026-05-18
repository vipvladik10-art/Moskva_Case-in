"""Проверка разграничения прав API."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.main import app
from app.services.demo.scenario import reset_demo


@pytest.fixture(autouse=True)
def _reset():
    reset_demo()
    yield
    reset_demo()


@pytest.mark.asyncio
async def test_viewer_cannot_delete_site(monkeypatch):
    monkeypatch.setattr(settings, "auth_enabled", True)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.delete(
            "/api/v1/sites/999",
            headers={"Authorization": f"Bearer {settings.viewer_api_token}"},
        )
        assert r.status_code == 403


@pytest.mark.asyncio
async def test_admin_can_access_mutations(monkeypatch):
    monkeypatch.setattr(settings, "auth_enabled", True)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get(
            "/api/v1/sites",
            headers={"Authorization": f"Bearer {settings.admin_api_token}"},
        )
        assert r.status_code == 200


@pytest.mark.asyncio
async def test_login_invalid_token():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.post("/api/v1/auth/login", json={"token": "wrong"})
        assert r.status_code == 401


@pytest.mark.asyncio
async def test_reset_requires_admin(monkeypatch):
    monkeypatch.setattr(settings, "auth_enabled", True)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.post(
            "/api/v1/demo/reset",
            headers={"Authorization": f"Bearer {settings.viewer_api_token}"},
        )
        assert r.status_code == 403
