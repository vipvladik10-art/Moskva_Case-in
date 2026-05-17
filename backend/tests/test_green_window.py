"""Эталонные кейсы согласованы с E1 (см. docs/algorithms.md §8)."""

from datetime import datetime, timedelta, timezone

import pytest

from app.schemas.weather import HourlyForecast
from app.services.algorithms.green_window import compute_green_window


def _series(specs: list[tuple[float, float, float]]) -> list[HourlyForecast]:
    base = datetime(2026, 5, 17, 10, 0, tzinfo=timezone.utc)
    out: list[HourlyForecast] = []
    for i, (temp, precip, pop) in enumerate(specs):
        out.append(
            HourlyForecast(
                valid_at=base + timedelta(hours=i + 1),
                issued_at=base,
                source="test",
                temp_c=temp,
                precip_mm_h=precip,
                precip_probability=pop,
                wind_speed_ms=2.0,
                confidence=0.9,
            )
        )
    return out


@pytest.fixture
def now_fixed() -> datetime:
    return datetime(2026, 5, 17, 10, 0, tzinfo=timezone.utc)


def test_clear_day_yields_full_window(now_fixed):
    forecast = _series([(15.0, 0.0, 0.1)] * 12)
    w = compute_green_window(forecast, delivery_time_min=60, now=now_fixed)
    assert w is not None
    assert w.duration_min >= 60


def test_rain_at_hour_6_truncates_window(now_fixed):
    specs = [(15.0, 0.0, 0.1)] * 5 + [(15.0, 2.0, 0.9)] * 2 + [(15.0, 0.0, 0.1)] * 5
    w = compute_green_window(_series(specs), delivery_time_min=60, now=now_fixed)
    assert w is not None
    assert w.start.hour == 11
    assert w.end.hour <= 16


def test_cold_day_returns_none(now_fixed):
    forecast = _series([(3.0, 0.0, 0.1)] * 8)
    assert compute_green_window(forecast, delivery_time_min=60, now=now_fixed) is None


def test_two_windows_picks_longest(now_fixed):
    specs = (
        [(15.0, 0.0, 0.1)] * 2
        + [(15.0, 1.0, 0.8)] * 1
        + [(15.0, 0.0, 0.1)] * 5
        + [(15.0, 1.0, 0.8)] * 1
    )
    w = compute_green_window(_series(specs), delivery_time_min=60, now=now_fixed)
    assert w is not None
    assert w.duration_min >= 60
