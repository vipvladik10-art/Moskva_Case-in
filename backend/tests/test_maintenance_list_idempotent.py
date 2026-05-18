"""GET /maintenance/tasks не должен создавать наряды."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.services.demo.scenario import reset_demo


@pytest.fixture(autouse=True)
def _reset():
    reset_demo()
    yield
    reset_demo()


@pytest.mark.asyncio
async def test_list_tasks_does_not_create_on_poll():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        counts = []
        for _ in range(5):
            r = await client.get("/api/v1/maintenance/tasks")
            assert r.status_code == 200
            counts.append(len(r.json()))
        assert counts[0] == counts[-1]
