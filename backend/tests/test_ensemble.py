from datetime import datetime, timezone

from app.schemas.weather import HourlyForecast
from app.services.weather.ensemble import ensemble_forecasts


def _h(source: str, temp: float, precip: float, pop: float) -> HourlyForecast:
    return HourlyForecast(
        valid_at=datetime(2026, 5, 17, 12, 0, tzinfo=timezone.utc),
        issued_at=datetime(2026, 5, 17, 10, 0, tzinfo=timezone.utc),
        source=source,
        temp_c=temp,
        precip_mm_h=precip,
        precip_probability=pop,
        wind_speed_ms=2.0,
        confidence=0.9,
    )


def test_ensemble_averages_temperatures():
    res = ensemble_forecasts(
        [
            [_h("a", 10, 0, 0.1)],
            [_h("b", 14, 0, 0.2)],
            [_h("c", 12, 0, 0.0)],
        ]
    )
    assert len(res) == 1
    assert res[0].temp_c == 12.0
    assert res[0].source == "ensemble"


def test_ensemble_takes_max_precip_probability():
    res = ensemble_forecasts(
        [
            [_h("a", 10, 0, 0.1)],
            [_h("b", 10, 0, 0.7)],
        ]
    )
    assert float(res[0].precip_probability) == 0.7
