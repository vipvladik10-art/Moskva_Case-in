-- Расширения, необходимые для гео и таймсерий.
-- Выполняется один раз при первом старте контейнера db.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS timescaledb;
