# ML-модели

Здесь хранятся сериализованные `joblib` модели для:

- `calibrator.joblib` — калибратор вероятностей осадков. Загружается в
  `backend/app/services/ml/calibrator.py::ForecastCalibrator.from_artifact`.
- `green_window_predictor.joblib` — предиктор длительности зелёного окна.
  Загружается в `backend/app/services/ml/green_window_predictor.py`.

## Формат

Каждый файл — `joblib.dump({"model": <fitted sklearn model>, "name": "..."})`.

Если файла нет, бэкенд продолжает работать в **identity / heuristic** режиме —
без изменения поведения относительно сырого прогноза провайдера.

## Обучение

Скрипт `scripts/train_calibrator.py` (TODO E2) читает таблицу
`forecast_hourly` (TimescaleDB) и таблицу фактической погоды,
обучает `IsotonicRegression` / `GradientBoostingRegressor`
и сохраняет артефакт сюда.

После обучения вызовите `POST /api/v1/ml/reload` — бэкенд подхватит новый
артефакт без рестарта.

## Endpoints

- `GET /api/v1/ml/status` — статус моделей.
- `POST /api/v1/ml/reload` — перезагрузить модели с диска.
- `GET /api/v1/ml/calibration/{site_id}` — диагностика "сырое vs калиброванное".
