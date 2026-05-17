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

## Демо-обучение

Для локального демо без накопленной БД выполните из корня репозитория:

```powershell
python scripts/train_ml_demo.py
```

Скрипт сохранит лёгкие демо-модели с `predict()`-контрактом и создаст:

- `data/models/calibrator.joblib`
- `data/models/green_window_predictor.joblib`

Если бэкенд уже запущен, после генерации вызовите `POST /api/v1/ml/reload`.

## Реальное обучение

Следующий шаг для продакшн-датасета — скрипт, который читает таблицу
`forecast_hourly` (TimescaleDB) и таблицу фактической погоды, обучает
`IsotonicRegression` / `GradientBoostingRegressor` и сохраняет артефакты сюда.

После обучения вызовите `POST /api/v1/ml/reload` — бэкенд подхватит новый
артефакт без рестарта.

## Endpoints

- `GET /api/v1/ml/status` — статус моделей.
- `POST /api/v1/ml/reload` — перезагрузить модели с диска.
- `GET /api/v1/ml/calibration/{site_id}` — диагностика "сырое vs калиброванное".
