from fastapi import APIRouter, Query

from app.schemas.weather import HourlyForecast
from app.services.weather.mock import MockWeatherProvider

router = APIRouter()


@router.get("/{site_id}/forecast", response_model=list[HourlyForecast])
async def get_forecast(site_id: int, hours: int = Query(default=24, ge=1, le=72)) -> list[HourlyForecast]:
    """TODO(P1+E2, S1→S2): подменить MockWeatherProvider на ensemble из БД."""
    provider = MockWeatherProvider()
    return await provider.fetch(lat=0.0, lon=0.0, hours=hours)
