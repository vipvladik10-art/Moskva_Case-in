"""Small importable models used by the offline demo artifact generator."""

from __future__ import annotations


class DemoProbabilityCalibrator:
    """Monotonic probability calibrator with sklearn-like predict()."""

    def predict(self, values: list[float]) -> list[float]:
        return [self._predict_one(float(value)) for value in values]

    @staticmethod
    def _predict_one(raw_probability: float) -> float:
        raw_probability = max(0.0, min(1.0, raw_probability))
        if raw_probability < 0.25:
            calibrated = raw_probability * 0.75
        elif raw_probability < 0.7:
            calibrated = 0.18 + (raw_probability - 0.25) * 1.15
        else:
            calibrated = 0.7 + (raw_probability - 0.7) * 0.85
        return max(0.0, min(1.0, calibrated))


class DemoGreenWindowRegressor:
    """Green-window duration regressor with sklearn-like predict()."""

    def predict(self, rows: list[list[float]]) -> list[float]:
        return [self._predict_one(row) for row in rows]

    @staticmethod
    def _predict_one(row: list[float]) -> float:
        mean_pop, max_mm_h, mean_temp_c, mean_wind_ms, baseline_min = [float(value) for value in row]
        rain_penalty = max(0.0, mean_pop - 0.25) * 420 + max(0.0, max_mm_h - 0.4) * 65
        cold_penalty = max(0.0, 8.0 - mean_temp_c) * 18
        wind_penalty = max(0.0, mean_wind_ms - 7.0) * 10
        dry_bonus = max(0.0, 0.18 - mean_pop) * 120 + max(0.0, mean_temp_c - 14.0) * 4
        return max(0.0, min(24 * 60.0, baseline_min - rain_penalty - cold_penalty - wind_penalty + dry_bonus))
