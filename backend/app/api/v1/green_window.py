from fastapi import APIRouter

from app.core.config import settings
from app.schemas.green_window import (
    GreenWindowRequest,
    GreenWindowResponse,
    MaxTonnageRequest,
    MaxTonnageResponse,
    WindowInterval,
)
from app.services.algorithms import compute_green_window, compute_max_tonnage
from app.services.weather.mock import MockWeatherProvider

router = APIRouter()


@router.post("/{site_id}/green-window", response_model=GreenWindowResponse)
async def green_window(site_id: int, body: GreenWindowRequest) -> GreenWindowResponse:
    """TODO(P1, S2): получить участок, ближайший АБЗ и реальный ensemble-прогноз."""
    forecast = await MockWeatherProvider().fetch(lat=0.0, lon=0.0, hours=24)
    delivery_time_min = 60
    window = compute_green_window(
        forecast,
        delivery_time_min=delivery_time_min,
        precip_threshold=body.precip_threshold,
        min_temp_c=settings.green_window_min_temp_c,
        min_duration_min=body.min_duration_min,
    )
    return GreenWindowResponse(
        site_id=site_id,
        window=(
            WindowInterval(start=window.start, end=window.end, duration_min=window.duration_min)
            if window
            else None
        ),
        plant_id=None,
        delivery_time_min=delivery_time_min,
        confidence=window.confidence if window else 0.0,
    )


@router.post("/{site_id}/max-tonnage", response_model=MaxTonnageResponse)
async def max_tonnage(site_id: int, body: MaxTonnageRequest) -> MaxTonnageResponse:
    """TODO(P1, S2): подставить реальные параметры участка и АБЗ из БД."""
    result = compute_max_tonnage(
        window_minutes=180,
        delivery_time_min=60,
        cooling_time_min=48,
        plant_capacity_t_h=60,
        lane_width_m=4.0,
        layer_thickness_m=0.05,
        mix_density_t_m3=2.4,
    )
    return MaxTonnageResponse(
        site_id=site_id,
        plant_id=body.plant_id or 0,
        t_window_min=result.t_window_min,
        t_useful_min=result.t_useful_min,
        max_tonnage_t=result.max_tonnage_t,
        limiting_factor=result.limiting_factor,
        recommended_order_t=result.recommended_order_t,
        explanation=f"Ограничивает: {result.limiting_factor}",
    )
