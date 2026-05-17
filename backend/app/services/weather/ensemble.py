from collections import defaultdict
from statistics import median

from app.schemas.weather import HourlyForecast


def ensemble_forecasts(
    forecasts: list[list[HourlyForecast]],
    weights: dict[str, float] | None = None,
) -> list[HourlyForecast]:
    """Объединяет прогнозы нескольких источников по часам.

    Алгоритм baseline:
      - континуальные поля (T, осадки, ветер) — взвешенное среднее, по умолч. равные веса;
      - вероятность осадков — max (консервативный подход);
      - confidence — median(individual confidence) с понижением, если источников < 2.

    TODO(E2): заменить baseline на регрессионный калибровщик
    после накопления исторических данных.
    """
    weights = weights or {}
    bucket: dict[tuple, list[HourlyForecast]] = defaultdict(list)
    for series in forecasts:
        for h in series:
            bucket[h.valid_at].append(h)

    out: list[HourlyForecast] = []
    for valid_at, hours in sorted(bucket.items()):
        ws = [weights.get(h.source, 1.0) for h in hours]
        total = sum(ws) or 1.0

        def wavg(field: str) -> float:
            return sum(getattr(h, field) * w for h, w in zip(hours, ws, strict=True)) / total

        out.append(
            HourlyForecast(
                valid_at=valid_at,
                issued_at=max(h.issued_at for h in hours),
                source="ensemble",
                temp_c=wavg("temp_c"),
                precip_mm_h=wavg("precip_mm_h"),
                precip_probability=max(h.precip_probability for h in hours),
                wind_speed_ms=wavg("wind_speed_ms"),
                confidence=median(h.confidence for h in hours) * (1.0 if len(hours) > 1 else 0.7),
            )
        )
    return out
