import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.main import app
from app.services.maintenance.scheduler import stop_forecast_scheduler

ADMIN_HEADERS = {"Authorization": f"Bearer {settings.admin_api_token}"}


@pytest.fixture(autouse=True)
def _test_settings(monkeypatch):
    monkeypatch.setattr(settings, "auto_maintenance_from_forecast", False)
    stop_forecast_scheduler()


@pytest.fixture
async def client() -> AsyncClient:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
