from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from app.schemas.weather import HourlyForecast


@dataclass(frozen=True)
class GreenWindow:
    start: datetime
    end: datetime
    confidence: float

    @property
    def duration_min(self) -> int:
        return int((self.end - self.start).total_seconds() // 60)


def compute_green_window(
    forecast: list[HourlyForecast],
    *,
    delivery_time_min: int,
    precip_threshold: float = 0.3,
    min_temp_c: float = 5.0,
    min_duration_min: int = 60,
    now: datetime | None = None,
) -> GreenWindow | None:
    """Находит максимальное «зелёное окно» в прогнозе.

    Спецификация см. docs/algorithms.md §1.
    Ответственный за корректность правил: E1 (инженер-технолог).
    Реализация: P1.
    """
    if not forecast:
        return None
    current = (now or datetime.now(tz=timezone.utc)).replace(microsecond=0)
    earliest_start = current + timedelta(minutes=delivery_time_min)

    candidates: list[tuple[datetime, datetime, list[float]]] = []
    open_from: datetime | None = None
    open_conf: list[float] = []

    for hour in sorted(forecast, key=lambda h: h.valid_at):
        if hour.valid_at < earliest_start:
            continue
        ok = (
            float(hour.precip_mm_h) == 0.0
            and float(hour.precip_probability) <= precip_threshold
            and float(hour.temp_c) >= min_temp_c
        )
        if ok and open_from is None:
            open_from = hour.valid_at
            open_conf = [float(hour.confidence)]
        elif ok and open_from is not None:
            open_conf.append(float(hour.confidence))
        elif not ok and open_from is not None:
            candidates.append((open_from, hour.valid_at, open_conf))
            open_from = None
            open_conf = []

    if open_from is not None:
        candidates.append((open_from, forecast[-1].valid_at, open_conf))

    candidates = [c for c in candidates if (c[1] - c[0]).total_seconds() / 60 >= min_duration_min]
    if not candidates:
        return None
    start, end, confs = max(candidates, key=lambda c: c[1] - c[0])
    return GreenWindow(start=start, end=end, confidence=sum(confs) / len(confs))
