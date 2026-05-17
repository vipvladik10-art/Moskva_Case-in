from app.schemas.weather import HourlyForecast
from app.services.weather.base import WeatherProvider


class OpenMeteoProvider(WeatherProvider):
    """TODO(E2): бесплатная альтернатива Gismeteo.

    Документация: https://open-meteo.com/en/docs
    Без API-ключа, мультимодельный ансамбль (ICON, GFS, ECMWF).
    """

    name = "open_meteo"

    async def fetch(self, lat: float, lon: float, hours: int = 24) -> list[HourlyForecast]:
        raise NotImplementedError("E2: реализовать в спринте 1")
