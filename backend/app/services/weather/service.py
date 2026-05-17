"""MVP weather service with OpenWeatherMap and deterministic fallback."""

from __future__ import annotations

from app.core.config import settings
from app.schemas.weather import HourlyForecast
from app.services.demo.state import demo_state
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
                return forecast
        except Exception:
            # MVP должен показываться стабильно даже при лимитах API или без сети.
            pass

    return await MockWeatherProvider(scenario=demo_scenario_for_site(site_id)).fetch(lat, lon, hours)
