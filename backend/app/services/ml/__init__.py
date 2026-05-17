"""ML-аналитика метео-планировщика.

Модули:
- `calibrator` — калибровка вероятностей осадков (Gradient Boosting / Logistic).
- `green_window_predictor` — предсказание длительности зелёного окна.

Все модели опционально загружаются при старте; если артефакт отсутствует или
зависимости (scikit-learn) не установлены, используется детерминированный
fallback и сервис продолжает работать в rule-based режиме.
"""

from app.services.ml.calibrator import (
    CalibrationResult,
    ForecastCalibrator,
    get_calibrator,
)

__all__ = [
    "CalibrationResult",
    "ForecastCalibrator",
    "get_calibrator",
]
