from datetime import datetime, timezone

import httpx

from app.core.config import settings
from app.schemas.weather import HourlyForecast
from app.services.weather.base import WeatherProvider


class OpenWeatherProvider(WeatherProvider):
    """Адаптер OpenWeatherMap One Call API 3.0.

    Документация: https://openweathermap.org/api/one-call-3
    Ответственный: E2.
    """

    name = "openweather"
    BASE_URL = "https://api.openweathermap.org/data/3.0/onecall"

    def __init__(self, api_key: str | None = None, client: httpx.AsyncClient | None = None) -> None:
        self.api_key = api_key or settings.openweather_api_key
        self.client = client or httpx.AsyncClient(timeout=10.0)

    async def fetch(self, lat: float, lon: float, hours: int = 24) -> list[HourlyForecast]:
        params = {
            "lat": lat,
            "lon": lon,
            "exclude": "current,minutely,daily,alerts",
            "units": "metric",
            "appid": self.api_key,
        }
        resp = await self.client.get(self.BASE_URL, params=params)
        resp.raise_for_status()
        data = resp.json()
        issued_at = datetime.now(tz=timezone.utc)
        out: list[HourlyForecast] = []
        for h in data.get("hourly", [])[:hours]:
            out.append(
                HourlyForecast(
                    valid_at=datetime.fromtimestamp(h["dt"], tz=timezone.utc),
                    issued_at=issued_at,
                    source=self.name,
                    temp_c=h["temp"],
                    feels_like_c=h.get("feels_like"),
                    precip_mm_h=h.get("rain", {}).get("1h", 0.0)
                    + h.get("snow", {}).get("1h", 0.0),
                    precip_probability=h.get("pop", 0.0),
                    wind_speed_ms=h.get("wind_speed", 0.0),
                    wind_gust_ms=h.get("wind_gust"),
                    humidity=h.get("humidity", 0) / 100 if h.get("humidity") else None,
                )
            )
        return out
