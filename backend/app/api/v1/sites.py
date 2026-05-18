import asyncio
from datetime import datetime, timedelta, timezone
from typing import TypedDict

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.core.security import CurrentUser, require_admin
from app.schemas.catalog import SiteCreatePayload, SiteUpdatePayload
from app.services.demo.state import demo_state
from app.services.weather.service import get_site_weather_summary

router = APIRouter()

_WEATHER_SUMMARY_TTL = timedelta(seconds=30)


class WeatherSummaryCache(TypedDict):
    expires_at: datetime
    rain_site_id: int | None
    data: list[dict] | None


_weather_summary_cache: WeatherSummaryCache = {
    "expires_at": datetime.min.replace(tzinfo=timezone.utc),
    "rain_site_id": None,
    "data": None,
}


@router.get("")
async def list_sites() -> list[dict]:
    return demo_state.sites()


@router.get("/weather-summary")
async def weather_summary() -> list[dict]:
    now = datetime.now(tz=timezone.utc)
    rain_site_id = demo_state.rain_site_id()
    cached = _weather_summary_cache["data"]
    if (
        cached is not None
        and _weather_summary_cache["rain_site_id"] == rain_site_id
        and now < _weather_summary_cache["expires_at"]
    ):
        return cached

    sites = demo_state.sites()
    summaries = await asyncio.gather(*(get_site_weather_summary(site) for site in sites))
    data = list(summaries)
    _weather_summary_cache.update(
        {
            "expires_at": now + _WEATHER_SUMMARY_TTL,
            "rain_site_id": rain_site_id,
            "data": data,
        }
    )
    return data


@router.post("")
async def create_site(
    payload: SiteCreatePayload,
    _admin: Annotated[CurrentUser, Depends(require_admin)],
) -> dict:
    _weather_summary_cache["data"] = None
    return demo_state.add_site(payload.model_dump(exclude_none=True))


@router.get("/{site_id}")
async def get_site(site_id: int) -> dict:
    site = demo_state.site(site_id)
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    return site


@router.patch("/{site_id}")
async def update_site(
    site_id: int,
    payload: SiteUpdatePayload,
    _admin: Annotated[CurrentUser, Depends(require_admin)],
) -> dict:
    _weather_summary_cache["data"] = None
    updated = demo_state.update_site(site_id, payload.model_dump(exclude_none=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Site not found")
    return updated


@router.delete("/{site_id}")
async def delete_site(
    site_id: int,
    _admin: Annotated[CurrentUser, Depends(require_admin)],
) -> dict:
    _weather_summary_cache["data"] = None
    if not demo_state.delete_site(site_id):
        raise HTTPException(status_code=404, detail="Site not found")
    return {"status": "ok", "id": site_id}
