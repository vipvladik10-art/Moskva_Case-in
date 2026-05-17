from fastapi import APIRouter, HTTPException

from app.core.config import settings
from app.schemas.green_window import (
    GreenWindowRequest,
    GreenWindowResponse,
    MaxTonnageRequest,
    MaxTonnageResponse,
    WindowInterval,
)
from app.services.algorithms import compute_green_window, compute_max_tonnage
from app.services.algorithms.geo import delivery_time_minutes, haversine_km
from app.services.demo.state import demo_state
from app.services.weather.service import get_site_forecast

router = APIRouter()


def _delivery_min(site: dict, plant: dict) -> int:
    distance = haversine_km(
        site["location"]["lat"],
        site["location"]["lon"],
        plant["location"]["lat"],
        plant["location"]["lon"],
    )
    return delivery_time_minutes(distance, order_lead_time_hours=0.5)


@router.post("/{site_id}/green-window", response_model=GreenWindowResponse)
async def green_window(site_id: int, body: GreenWindowRequest) -> GreenWindowResponse:
    site = demo_state.site(site_id)
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    plant_id = site.get("preferred_plant_id")
    plant = demo_state.plant(plant_id) if plant_id else None
    delivery_min = _delivery_min(site, plant) if plant else 60

    forecast = await get_site_forecast(
        site_id=site_id,
        lat=site["location"]["lat"],
        lon=site["location"]["lon"],
        hours=24,
    )

    min_temp = (
        settings.green_window_min_temp_thin_layer_c
        if site.get("thin_layer")
        else settings.green_window_min_temp_c
    )
    window = compute_green_window(
        forecast,
        delivery_time_min=delivery_min,
        precip_threshold=body.precip_threshold,
        min_temp_c=min_temp,
        min_duration_min=body.min_duration_min,
    )

    alternatives = []
    for p in demo_state.plants():
        if p["id"] == plant_id or not p.get("active"):
            continue
        alt_delivery = _delivery_min(site, p)
        alternatives.append(
            {
                "plant_id": p["id"],
                "delivery_time_min": alt_delivery,
                "confidence": 0.7,
            }
        )

    return GreenWindowResponse(
        site_id=site_id,
        window=(
            WindowInterval(start=window.start, end=window.end, duration_min=window.duration_min)
            if window
            else None
        ),
        plant_id=plant_id,
        delivery_time_min=delivery_min,
        confidence=window.confidence if window else 0.0,
        alternatives=alternatives,
    )


@router.post("/{site_id}/max-tonnage", response_model=MaxTonnageResponse)
async def max_tonnage(site_id: int, body: MaxTonnageRequest) -> MaxTonnageResponse:
    site = demo_state.site(site_id)
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    plant_id = body.plant_id or site.get("preferred_plant_id")
    plant = demo_state.plant(plant_id) if plant_id else None
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")

    delivery_min = _delivery_min(site, plant)

    forecast = await get_site_forecast(
        site_id=site_id,
        lat=site["location"]["lat"],
        lon=site["location"]["lon"],
        hours=24,
    )
    min_temp = (
        settings.green_window_min_temp_thin_layer_c
        if site.get("thin_layer")
        else settings.green_window_min_temp_c
    )
    window = compute_green_window(
        forecast,
        delivery_time_min=delivery_min,
        precip_threshold=0.3,
        min_temp_c=min_temp,
        min_duration_min=60,
    )
    window_min = window.duration_min if window else 0

    result = compute_max_tonnage(
        window_minutes=window_min,
        delivery_time_min=0,
        cooling_time_min=48,
        plant_capacity_t_h=float(plant["capacity_t_per_hour"]),
        lane_width_m=float(site["lane_width_m"]),
        layer_thickness_m=float(site["layer_thickness_m"]),
        mix_density_t_m3=float(site["mix_density_t_m3"]),
    )

    if result.limiting_factor == "plant_capacity":
        why = f"ограничивает производительность АБЗ ({plant['capacity_t_per_hour']} т/ч)"
    else:
        why = "ограничивает скорость укладчика"

    return MaxTonnageResponse(
        site_id=site_id,
        plant_id=plant_id,
        t_window_min=result.t_window_min,
        t_useful_min=result.t_useful_min,
        max_tonnage_t=result.max_tonnage_t,
        limiting_factor=result.limiting_factor,
        recommended_order_t=result.recommended_order_t,
        explanation=(
            f"Окно {result.t_window_min} мин, полезное время {result.t_useful_min} мин; {why}."
        ),
    )
