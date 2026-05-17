from app.schemas.weather import HourlyForecast
from app.services.weather.base import WeatherProvider


class TomorrowIoProvider(WeatherProvider):
    """TODO(E2): реализовать адаптер Tomorrow.io.

    Документация: https://docs.tomorrow.io/reference/weather-forecast
    Endpoint: GET https://api.tomorrow.io/v4/weather/forecast
    """

    name = "tomorrowio"

    async def fetch(self, lat: float, lon: float, hours: int = 24) -> list[HourlyForecast]:
        raise NotImplementedError("E2: реализовать в спринте 1, см. docs/data_sources.md")
