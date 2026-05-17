from functools import lru_cache
from pathlib import Path

import yaml

TABLE_PATH = Path(__file__).parent / "compaction_table.yaml"


@lru_cache(maxsize=1)
def _load_table() -> dict:
    with TABLE_PATH.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def cooling_time_to_min(
    start_temp_c: float,
    target_temp_c: float = 80,
    *,
    wind_ms: float = 3.0,
    base_temp_c: float = 20.0,
) -> int:
    """Возвращает оценку времени остывания (минут) до `target_temp_c`.

    Использует таблицу 1 техкарты с линейной интерполяцией и эмпирическими
    поправками на ветер и температуру основания.

    Источник: ГОСТ-таблица; коэффициенты валидирует E1.
    """
    table = _load_table()
    rows = table["rows"]
    targets = table["targets"]
    target_int = int(target_temp_c)
    if target_int not in targets:
        raise ValueError(f"Целевая температура {target_temp_c} не в таблице.")
    col = targets.index(target_int)

    starts = sorted(rows.keys(), reverse=True)
    if start_temp_c >= starts[0]:
        base = rows[starts[0]][col]
    elif start_temp_c <= starts[-1]:
        base = rows[starts[-1]][col]
    else:
        for i in range(len(starts) - 1):
            hi, lo = starts[i], starts[i + 1]
            if lo <= start_temp_c <= hi:
                hi_v, lo_v = rows[hi][col], rows[lo][col]
                if hi_v is None or lo_v is None:
                    return hi_v or lo_v or 0
                ratio = (start_temp_c - lo) / (hi - lo)
                base = lo_v + (hi_v - lo_v) * ratio
                break
        else:
            base = rows[starts[-1]][col]

    if base is None:
        return 0
    wind_corr = 1 + max(0.0, wind_ms - 5) * 0.05
    base_corr = 1 + max(0.0, 18 - base_temp_c) * 0.02
    return int(round(base * wind_corr * base_corr))
