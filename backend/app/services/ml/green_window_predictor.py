"""Предиктор длительности зелёного окна.

Цель: дать оценку длительности безосадкового интервала точнее, чем простой
проход по часовому прогнозу. Полезно когда часовые `precip_probability`
зашумлены и реальное окно может оказаться длиннее/короче.

MVP-логика:
- Если sklearn-модель загружена (RandomForestRegressor / GradientBoosting),
  используем её для предсказания минут зелёного окна.
- Иначе вычисляем эвристическую оценку по тренду давления (если есть)
  и среднему `precip_probability` ближайших 6 часов.

Признаки (входы модели):
- mean_precip_probability_6h
- max_precip_mm_h_6h
- mean_temp_c_6h
- mean_wind_speed_ms_6h
- baseline_window_min  — длительность по rule-based алгоритму

Целевая переменная (offline-обучение):
- фактическое количество минут без осадков начиная с issued_at.
"""

from __future__ import annotations

import logging
import statistics
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from app.schemas.weather import HourlyForecast
from app.services.ml.paths import models_dir

logger = logging.getLogger(__name__)

MODEL_PATH = models_dir() / "green_window_predictor.joblib"


@dataclass
class GreenWindowPrediction:
    """Результат предсказания."""

    predicted_min: int
    baseline_min: int
    confidence: float
    method: str  # 'ml' | 'heuristic'


class GreenWindowPredictor:
    """ML-предиктор с heuristic-fallback."""

    def __init__(self, model: Any | None = None) -> None:
        self._model = model

    @property
    def is_loaded(self) -> bool:
        return self._model is not None

    @staticmethod
    def _features(forecast: list[HourlyForecast], baseline_min: int) -> list[float]:
        slice6 = forecast[:6] or forecast
        return [
            statistics.mean((float(h.precip_probability) for h in slice6)) if slice6 else 0.0,
            max((float(h.precip_mm_h) for h in slice6), default=0.0),
            statistics.mean((float(h.temp_c) for h in slice6)) if slice6 else 0.0,
            statistics.mean((float(h.wind_speed_ms) for h in slice6)) if slice6 else 0.0,
            float(baseline_min),
        ]

    def predict(
        self,
        forecast: list[HourlyForecast],
        baseline_min: int,
    ) -> GreenWindowPrediction:
        """Вернуть оценку длительности окна.

        `baseline_min` — длительность из rule-based `compute_green_window`.
        """
        if not forecast:
            return GreenWindowPrediction(
                predicted_min=baseline_min,
                baseline_min=baseline_min,
                confidence=0.5,
                method="heuristic",
            )

        features = self._features(forecast, baseline_min)

        if self._model is not None:
            try:
                value = float(self._model.predict([features])[0])
                return GreenWindowPrediction(
                    predicted_min=max(0, int(round(value))),
                    baseline_min=baseline_min,
                    confidence=0.85,
                    method="ml",
                )
            except Exception as exc:  # pragma: no cover
                logger.warning("Green window ML predict failed: %s", exc)

        # Эвристика: чем ниже среднее POP, тем выше доверие к baseline; при
        # высоком POP уменьшаем оценку. Линейная коррекция вокруг baseline.
        mean_pop = features[0]
        max_mm = features[1]
        adjustment = 1.0
        if mean_pop > 0.4:
            adjustment -= (mean_pop - 0.4) * 0.6
        if max_mm > 1.0:
            adjustment -= 0.15
        adjustment = max(0.4, min(1.2, adjustment))

        return GreenWindowPrediction(
            predicted_min=max(0, int(round(baseline_min * adjustment))),
            baseline_min=baseline_min,
            confidence=0.65 if mean_pop < 0.2 else 0.5,
            method="heuristic",
        )

    @classmethod
    def from_artifact(cls, path: Path | None = None) -> GreenWindowPredictor:
        artifact_path = path or MODEL_PATH
        if not artifact_path.exists():
            return cls()
        try:
            import joblib  # type: ignore[import-untyped]

            data = joblib.load(artifact_path)
            model = data.get("model") if isinstance(data, dict) else data
            return cls(model=model)
        except Exception as exc:
            logger.warning("Failed to load green window predictor: %s", exc)
            return cls()


_predictor: GreenWindowPredictor | None = None


def get_predictor() -> GreenWindowPredictor:
    global _predictor
    if _predictor is None:
        _predictor = GreenWindowPredictor.from_artifact()
    return _predictor


def reset_predictor() -> None:
    """Сбросить кэш предиктора после обновления артефакта."""
    global _predictor
    _predictor = None
