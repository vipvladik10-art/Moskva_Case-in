"""MVP weather service with OpenWeatherMap and deterministic fallback."""

from __future__ import annotations

from datetime import datetime, timezone

from app.core.config import settings
from app.schemas.weather import HourlyForecast
from app.services.demo.state import demo_state
from app.services.ml.calibrator import get_calibrator
from app.services.weather.mock import MockWeatherProvider
from app.services.weather.openweather import OpenWeatherProvider


def demo_scenario_for_site(site_id: int) -> list[dict]:
    """Если демо-дождь активен на участке, отдаём принудительный дождевой сценарий."""
    rain_site = demo_state.rain_site_id()
    is_rain = rain_site == site_id
    out: list[dict] = []
    for i in range(24):
        if is_rain and 0 <= i < 3:
            out.append(
                {
                    "temp_c": 11.0,
                    "precip_mm_h": 3.5,
                    "precip_probability": 0.95,
                    "wind_speed_ms": 6.0,
                }
            )
        elif not is_rain and 7 <= i < 9:
            out.append(
                {
                    "temp_c": 13.0,
                    "precip_mm_h": 1.5,
                    "precip_probability": 0.6,
                    "wind_speed_ms": 4.0,
                }
            )
        else:
            out.append(
                {
                    "temp_c": 16.0,
                    "precip_mm_h": 0.0,
                    "precip_probability": 0.1,
                    "wind_speed_ms": 3.0,
                }
            )
    return out


async def get_site_forecast(site_id: int, lat: float, lon: float, hours: int = 24) -> list[HourlyForecast]:
    """Вернуть прогноз для участка.

    При активном демо-дожде всегда используем mock, чтобы показ перед жюри был
    воспроизводимым. В обычном режиме пробуем OpenWeatherMap и бесшовно
    откатываемся на mock при пустом ключе, ошибке сети или лимите API.
    """
    if demo_state.rain_site_id() == site_id:
        return await MockWeatherProvider(scenario=demo_scenario_for_site(site_id)).fetch(lat, lon, hours)

    if settings.openweather_api_key:
        try:
            forecast = await OpenWeatherProvider().fetch(lat, lon, hours)
            if forecast:
                # ML-калибровка вероятности и интенсивности; identity-fallback
                # без артефакта — поведение не меняется.
                return get_calibrator().apply(forecast)
        except Exception:
            # MVP должен показываться стабильно даже при лимитах API или без сети.
            pass

    return await MockWeatherProvider(scenario=demo_scenario_for_site(site_id)).fetch(lat, lon, hours)


async def get_site_weather_summary(site: dict) -> dict:
    site_id = site["id"]
    lat = site["location"]["lat"]
    lon = site["location"]["lon"]
    demo_forced = demo_state.rain_site_id() == site_id

    forecast = await get_site_forecast(site_id=site_id, lat=lat, lon=lon, hours=6)
    source = forecast[0].source if forecast else "unknown"

    current = None
    if settings.openweather_api_key and not demo_forced:
        try:
            current = await OpenWeatherProvider().fetch_current(lat, lon)
            source = current.get("source", source)
        except Exception:
            current = None

    if current is None:
        first = forecast[0] if forecast else None
        current = {
            "temp_c": float(first.temp_c) if first else None,
            "wind_speed_ms": float(first.wind_speed_ms) if first else 0.0,
            "precip_mm_h": float(first.precip_mm_h) if first else 0.0,
            "weather_label": "демо-дождь" if demo_forced else "mock-прогноз",
            "updated_at": datetime.now(tz=timezone.utc),
            "source": source,
        }

    max_pop = max((float(h.precip_probability) for h in forecast), default=0.0)
    max_precip = max((float(h.precip_mm_h) for h in forecast), default=0.0)
    hourly_precip_mm_h = [round(float(h.precip_mm_h), 2) for h in forecast[:6]]
    hourly_precip_probability = [round(float(h.precip_probability), 2) for h in forecast[:6]]
    hourly_temp_c = [round(float(h.temp_c), 1) for h in forecast[:6]]
    risk_hour = next(
        (
            h.valid_at
            for h in forecast
            if float(h.precip_mm_h) > 0.1 or float(h.precip_probability) >= 0.35
        ),
        None,
    )

    current_precip = float(current.get("precip_mm_h") or 0.0)
    if demo_forced or current_precip > 0.1:
        state = "rain"
    elif max_pop >= 0.35 or max_precip > 0.1:
        state = "risk"
    elif current.get("temp_c") is None:
        state = "unknown"
    else:
        state = "clear"

    return {
        "site_id": site_id,
        "source": "mock fallback" if source == "mock" else source,
        "updated_at": current["updated_at"].isoformat(),
        "current": {
            "temp_c": current.get("temp_c"),
            "wind_speed_ms": current.get("wind_speed_ms", 0.0),
            "precip_mm_h": current_precip,
            "weather_label": current.get("weather_label", "нет данных"),
        },
        "next_6h": {
            "max_precip_probability": max_pop,
            "max_precip_mm_h": max_precip,
            "risk_starts_at": risk_hour.isoformat() if risk_hour else None,
            "hourly_precip_mm_h": hourly_precip_mm_h,
            "hourly_precip_probability": hourly_precip_probability,
            "hourly_temp_c": hourly_temp_c,
        },
        "state": state,
        "demo_forced": demo_forced,
    }
