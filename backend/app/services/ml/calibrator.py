"""Калибровка прогнозов осадков.

Текущая реализация — изотоническая регрессия / логистическая модель поверх
сырых вероятностей провайдера (OpenWeatherMap), плюс легкая коррекция
интенсивности `precip_mm_h` через мультипликатор по диапазону.

Калибратор спроектирован, чтобы:
- быть полностью опциональным (rule-based fallback при отсутствии sklearn / артефакта);
- работать без внешних зависимостей в "холодном" режиме (см. `IdentityCalibrator`);
- дообучаться оффлайн скриптом (`scripts/train_calibrator.py` — TODO),
  читая данные из TimescaleDB-таблицы `forecast_hourly` + фактическая погода.

Вход: `HourlyForecast` от провайдера.
Выход: `HourlyForecast` с скорректированными `precip_probability` и `precip_mm_h`,
а также метаполе `confidence`, отражающее качество калибровки.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from app.schemas.weather import HourlyForecast

logger = logging.getLogger(__name__)

REPO_ROOT = Path(__file__).resolve().parents[4]
MODELS_DIR = REPO_ROOT / "data" / "models"
CALIBRATOR_PATH = MODELS_DIR / "calibrator.joblib"


@dataclass
class CalibrationResult:
    """Метаданные одной калибровки — для логирования / отладки."""

    raw_probability: float
    calibrated_probability: float
    raw_precip_mm_h: float
    calibrated_precip_mm_h: float
    model: str


class ForecastCalibrator:
    """Калибратор прогнозов с graceful fallback.

    Состояния:
    - `model is None`: identity-калибратор (без изменений), `model_name = 'identity'`.
    - `model is not None`: загружена sklearn-модель (например, IsotonicRegression).

    Не требует sklearn для работы в identity-режиме.
    """

    def __init__(self, model: Any | None = None, model_name: str = "identity") -> None:
        self._model = model
        self._model_name = model_name

    @property
    def is_loaded(self) -> bool:
        return self._model is not None

    @property
    def model_name(self) -> str:
        return self._model_name

    def calibrate_probability(self, raw_p: float) -> float:
        """Вернуть калиброванную вероятность осадков [0, 1]."""
        raw_p = max(0.0, min(1.0, float(raw_p)))
        if self._model is None:
            return raw_p
        try:
            # IsotonicRegression / sklearn calibrator — единый интерфейс.
            value = float(self._model.predict([raw_p])[0])
            return max(0.0, min(1.0, value))
        except Exception as exc:  # pragma: no cover — защита продакшна
            logger.warning("calibrate_probability failed: %s", exc)
            return raw_p

    def calibrate_intensity(self, raw_mm_h: float, raw_p: float) -> float:
        """Скорректировать интенсивность.

        Простая эвристика: если калиброванная вероятность сильно ниже сырой,
        интенсивность тоже уменьшается пропорционально. Это компенсирует склонность
        OpenWeatherMap завышать единичные пиковые значения.
        """
        raw_mm_h = max(0.0, float(raw_mm_h))
        if raw_mm_h == 0.0:
            return 0.0
        if self._model is None:
            return raw_mm_h
        cal_p = self.calibrate_probability(raw_p)
        if raw_p < 0.05:
            return raw_mm_h
        ratio = cal_p / max(raw_p, 0.05)
        return round(raw_mm_h * max(0.3, min(1.5, ratio)), 2)

    def apply(self, forecast: list[HourlyForecast]) -> list[HourlyForecast]:
        """Вернуть новый список прогнозов с калибровкой.

        Для identity-калибратора возвращает исходный список без копирования.
        """
        if self._model is None:
            return forecast
        out: list[HourlyForecast] = []
        for h in forecast:
            cal_p = self.calibrate_probability(h.precip_probability)
            cal_mm = self.calibrate_intensity(h.precip_mm_h, h.precip_probability)
            out.append(
                h.model_copy(
                    update={
                        "precip_probability": cal_p,
                        "precip_mm_h": cal_mm,
                        "confidence": min(1.0, h.confidence * 1.1),
                    }
                )
            )
        return out

    def explain(self, forecast: HourlyForecast) -> CalibrationResult:
        """Сгенерировать диагностику для отладки / API."""
        cal_p = self.calibrate_probability(forecast.precip_probability)
        cal_mm = self.calibrate_intensity(forecast.precip_mm_h, forecast.precip_probability)
        return CalibrationResult(
            raw_probability=float(forecast.precip_probability),
            calibrated_probability=cal_p,
            raw_precip_mm_h=float(forecast.precip_mm_h),
            calibrated_precip_mm_h=cal_mm,
            model=self._model_name,
        )

    @classmethod
    def from_artifact(cls, path: Path | None = None) -> ForecastCalibrator:
        """Попробовать загрузить sklearn-артефакт; иначе вернуть identity.

        Артефакт ожидается в формате `joblib`-сериализованного словаря:
            {"model": <fitted sklearn model>, "name": "isotonic_v1"}
        """
        artifact_path = path or CALIBRATOR_PATH
        if not artifact_path.exists():
            logger.info("Calibrator artifact not found at %s; using identity", artifact_path)
            return cls()
        try:
            import joblib  # type: ignore[import-untyped]

            data = joblib.load(artifact_path)
            model = data.get("model") if isinstance(data, dict) else data
            name = data.get("name", "loaded") if isinstance(data, dict) else "loaded"
            logger.info("Loaded calibrator '%s' from %s", name, artifact_path)
            return cls(model=model, model_name=str(name))
        except Exception as exc:
            logger.warning("Failed to load calibrator from %s: %s", artifact_path, exc)
            return cls()


_calibrator_singleton: ForecastCalibrator | None = None


def get_calibrator() -> ForecastCalibrator:
    """Lazy-singleton доступ к калибратору.

    При первом вызове пытается загрузить артефакт; на ошибках откатывается
    к identity-калибратору. Безопасно вызывать многократно.
    """
    global _calibrator_singleton
    if _calibrator_singleton is None:
        _calibrator_singleton = ForecastCalibrator.from_artifact()
    return _calibrator_singleton


def reset_calibrator() -> None:
    """Сбросить кэш — например, после переобучения модели."""
    global _calibrator_singleton
    _calibrator_singleton = None
