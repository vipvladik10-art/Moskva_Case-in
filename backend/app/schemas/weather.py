from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class HourlyForecast(BaseModel):
    """Нормализованный часовой прогноз — единый формат после адаптеров."""

    valid_at: datetime
    issued_at: datetime
    source: str
    temp_c: float
    feels_like_c: float | None = None
    precip_mm_h: float = 0.0
    precip_probability: float = Field(default=0.0, ge=0, le=1)
    precip_type: Literal["rain", "snow", "sleet"] | None = None
    wind_speed_ms: float = 0.0
    wind_gust_ms: float | None = None
    humidity: float | None = None
    confidence: float = Field(default=1.0, ge=0, le=1)
