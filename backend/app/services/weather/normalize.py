from app.schemas.weather import HourlyForecast


def normalize_to_hourly(raw: list[HourlyForecast]) -> list[HourlyForecast]:
    """Сортировка по времени, отсечение прошлых записей, заполнение пропусков.

    TODO(E2): расширить интерполяцией пропущенных часов.
    """
    return sorted(raw, key=lambda h: h.valid_at)
