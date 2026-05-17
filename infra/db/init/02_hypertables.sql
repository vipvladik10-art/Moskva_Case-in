-- Преобразуем таблицы прогнозов в TimescaleDB hypertables.
-- Запускается после Alembic-миграций (в S1).
-- TODO(E3): обернуть в Alembic-операцию op.execute(...) на стадии S1.

-- SELECT create_hypertable('forecast_hourly', 'valid_at', if_not_exists => TRUE);
-- SELECT create_hypertable('weather_raw',     'received_at', if_not_exists => TRUE);
