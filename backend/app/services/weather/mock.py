from datetime import datetime, timedelta, timezone

from app.schemas.weather import HourlyForecast
from app.services.weather.base import WeatherProvider


class MockWeatherProvider(WeatherProvider):
    """Детерминированный провайдер для тестов и демо без интернета.

    Сценарий по умолчанию: ясно 6 часов, дождь 2 часа, ясно дальше.
    Используется E3 для интеграционных тестов и для презентации.
    """

    name = "mock"

    def __init__(self, scenario: list[dict] | None = None) -> None:
        self.scenario = scenario or self._default_scenario()

    def _default_scenario(self) -> list[dict]:
        result: list[dict] = []
        for i in range(24):
            is_rain = 6 <= i < 8
            result.append(
                {
                    "temp_c": 15.0 if not is_rain else 12.0,
                    "precip_mm_h": 2.5 if is_rain else 0.0,
                    "precip_probability": 0.9 if is_rain else 0.05,
                    "wind_speed_ms": 3.0,
                }
            )
        return result

    async def fetch(self, lat: float, lon: float, hours: int = 24) -> list[HourlyForecast]:
        issued_at = datetime.now(tz=timezone.utc).replace(minute=0, second=0, microsecond=0)
        out: list[HourlyForecast] = []
        for i, s in enumerate(self.scenario[:hours]):
            out.append(
                HourlyForecast(
                    valid_at=issued_at + timedelta(hours=i + 1),
                    issued_at=issued_at,
                    source=self.name,
                    confidence=0.9,
                    **s,
                )
            )
        return out
