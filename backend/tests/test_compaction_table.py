import pytest

from app.services.algorithms.compaction_time import cooling_time_to_min


@pytest.mark.parametrize(
    "start,target,expected",
    [
        (150, 120, 24),
        (140, 80, 48),
        (135, 100, 28),
        (100, 80, 16),
    ],
)
def test_table_exact_rows(start, target, expected):
    """Точные значения таблицы 1 при штатных условиях (ветер 3 м/с, основание 20 °C)."""
    assert cooling_time_to_min(start, target, wind_ms=3.0, base_temp_c=20.0) == expected


def test_high_wind_increases_time():
    base = cooling_time_to_min(140, 80, wind_ms=3.0, base_temp_c=20.0)
    windy = cooling_time_to_min(140, 80, wind_ms=10.0, base_temp_c=20.0)
    assert windy > base
