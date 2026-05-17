import asyncio
from datetime import datetime, timedelta, timezone
from typing import TypedDict

from fastapi import APIRouter, HTTPException

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


@router.get("/{site_id}")
async def get_site(site_id: int) -> dict:
    site = demo_state.site(site_id)
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    return site
