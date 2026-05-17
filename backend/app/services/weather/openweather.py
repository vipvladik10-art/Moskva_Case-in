from datetime import datetime, timedelta, timezone

import httpx

from app.core.config import settings
from app.schemas.weather import HourlyForecast
from app.services.weather.base import WeatherProvider


class OpenWeatherProvider(WeatherProvider):
    """Адаптер OpenWeatherMap 5 day / 3 hour forecast API.

    Документация: https://openweathermap.org/forecast5
    Этот endpoint обычно доступен на бесплатном тарифе. Ответ приходит с шагом
    3 часа; для MVP разворачиваем каждый прогнозный блок в 3 часовые записи.
    Ответственный: E2.
    """

    name = "openweather"
    BASE_URL = "https://api.openweathermap.org/data/2.5/forecast"

    def __init__(self, api_key: str | None = None, client: httpx.AsyncClient | None = None) -> None:
        self.api_key = api_key or settings.openweather_api_key
        self.client = client or httpx.AsyncClient(timeout=10.0)

    async def fetch(self, lat: float, lon: float, hours: int = 24) -> list[HourlyForecast]:
        params = {
            "lat": lat,
            "lon": lon,
            "units": "metric",
            "appid": self.api_key,
        }
        resp = await self.client.get(self.BASE_URL, params=params)
        resp.raise_for_status()
        data = resp.json()
        issued_at = datetime.now(tz=timezone.utc)
        out: list[HourlyForecast] = []
        for h in data.get("list", []):
            valid_at = datetime.fromtimestamp(h["dt"], tz=timezone.utc)
            main = h.get("main", {})
            wind = h.get("wind", {})
            precip_3h = h.get("rain", {}).get("3h", 0.0) + h.get("snow", {}).get("3h", 0.0)
            # OpenWeather даёт накопленные осадки за 3 часа; для hourly-формата
            # делим на 3, чтобы получить приблизительную интенсивность мм/ч.
            precip_mm_h = precip_3h / 3
            for offset_h in range(3):
                if len(out) >= hours:
                    break
                out.append(
                    HourlyForecast(
                        valid_at=valid_at + timedelta(hours=offset_h),
                        issued_at=issued_at,
                        source=self.name,
                        temp_c=main.get("temp", 0.0),
                        feels_like_c=main.get("feels_like"),
                        precip_mm_h=precip_mm_h,
                        precip_probability=h.get("pop", 0.0),
                        wind_speed_ms=wind.get("speed", 0.0),
                        wind_gust_ms=wind.get("gust"),
                        humidity=main.get("humidity", 0) / 100 if main.get("humidity") else None,
                    )
                )
        return out
