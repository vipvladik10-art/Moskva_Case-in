from abc import ABC, abstractmethod

from app.schemas.weather import HourlyForecast


class WeatherProvider(ABC):
    """Базовый интерфейс провайдера прогноза погоды.

    Все реализации обязаны возвращать массив нормализованных часовых прогнозов.
    Ответственный за расширение списка реализаций — E2.
    """

    name: str

    @abstractmethod
    async def fetch(self, lat: float, lon: float, hours: int = 24) -> list[HourlyForecast]:
        """Получить почасовой прогноз для координат на горизонте `hours`."""
        raise NotImplementedError
