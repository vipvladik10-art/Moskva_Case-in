from fastapi import APIRouter, HTTPException, Query

from app.schemas.weather import HourlyForecast
from app.services.demo.state import demo_state
from app.services.weather.service import get_site_forecast

router = APIRouter()


@router.get("/{site_id}/forecast", response_model=list[HourlyForecast])
async def get_forecast(
    site_id: int, hours: int = Query(default=24, ge=1, le=72)
) -> list[HourlyForecast]:
    site = demo_state.site(site_id)
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    return await get_site_forecast(
        site_id=site_id,
        lat=site["location"]["lat"],
        lon=site["location"]["lon"],
        hours=hours,
    )
