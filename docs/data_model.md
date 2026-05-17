# Модель данных

> Расширения: `postgis`, `timescaledb`. См. `infra/db/init/01_extensions.sql`.

## ER-диаграмма (упрощённо)

```
plants ──┐
         │ 1   N
         └───< trucks >───── truck_dispatch_log
                                  │
sites ───< trucks (destination)   │
   │                               │
   │ 1   N                         │
   └───< green_windows             │
                                   │
machines ──< maintenance_tasks <───┘ (trigger weather)

forecast_hourly (hypertable, TimescaleDB)
weather_raw     (hypertable, TimescaleDB, по источнику)
supply_orders
```

## Таблицы

### `plants` — асфальтобетонные заводы
| col | type | note |
|---|---|---|
| id | bigserial PK | |
| name | text | |
| geom | geography(Point, 4326) | PostGIS |
| capacity_t_per_hour | numeric(6,2) | |
| active | bool | default true |

### `sites` — участки укладки
| col | type | note |
|---|---|---|
| id | bigserial PK | |
| name | text | |
| geom_point | geography(Point, 4326) | центроид |
| geom_line | geography(LineString, 4326) | геометрия участка |
| lane_width_m | numeric(4,2) | |
| layer_thickness_m | numeric(4,3) | |
| mix_density_t_m3 | numeric(4,2) | |
| mix_type | text | |
| thin_layer | bool | |
| preferred_plant_id | bigint FK plants | |

### `machines` — техника (укладчики, катки, перегружатели)
| col | type | note |
|---|---|---|
| id | bigserial PK | |
| kind | text | enum: paver, roller_9t, roller_12t, transfer, truck |
| plate | text | гос. номер |
| home_plant_id | bigint FK plants nullable | |
| maintenance_interval_h | integer | моточасы |
| last_maintenance_at | timestamptz | |

### `trucks` (наследник `machines.kind=truck`)
| col | type | note |
|---|---|---|
| id | bigserial PK | = machines.id |
| status | text | FSM |
| destination_site_id | bigint FK sites | |
| load_t | numeric(6,2) | текущий груз |
| current_geom | geography(Point, 4326) | |
| loaded_at | timestamptz | |

### `truck_dispatch_log` — история решений
| col | type |
|---|---|
| id | bigserial PK |
| truck_id | bigint FK |
| from_site_id | bigint FK sites |
| to_site_id | bigint FK sites |
| reason | text (e.g. `rain_at_origin`) |
| decided_at | timestamptz |
| decided_by | text (system / mechanic) |

### `forecast_hourly` (hypertable, partitioned by `valid_at`)
| col | type |
|---|---|
| site_id | bigint FK sites |
| valid_at | timestamptz |
| issued_at | timestamptz |
| source | text |
| temp_c | numeric(4,1) |
| precip_mm_h | numeric(4,2) |
| precip_probability | numeric(3,2) |
| wind_speed_ms | numeric(4,1) |
| confidence | numeric(3,2) |

Primary key: `(site_id, valid_at, source)`. Гипертаблица по `valid_at`.

### `weather_raw` (hypertable)
Сырые ответы провайдеров в `jsonb`, для отладки и истории.

### `green_windows` — кэш расчётов
| col | type |
|---|---|
| id | bigserial PK |
| site_id | bigint FK |
| computed_at | timestamptz |
| start_at | timestamptz |
| end_at | timestamptz |
| plant_id | bigint FK |
| confidence | numeric(3,2) |
| params | jsonb |

### `maintenance_tasks`
| col | type |
|---|---|
| id | bigserial PK |
| machine_id | bigint FK |
| created_at | timestamptz |
| reason | text (e.g. `weather_idle`) |
| status | text (open/in_progress/done) |
| assigned_to | text |
| due_at | timestamptz |

### `supply_orders`
| col | type |
|---|---|
| id | bigserial PK |
| target_kind | text (plant/site) |
| target_id | bigint |
| item | text (antifreeze, kerosene, ...) |
| quantity | numeric(8,2) |
| unit | text (l, kg) |
| reason | text |
| status | text |

## Индексы

```sql
CREATE INDEX ON plants  USING GIST (geom);
CREATE INDEX ON sites   USING GIST (geom_point);
CREATE INDEX ON sites   USING GIST (geom_line);
CREATE INDEX ON trucks  USING GIST (current_geom);
CREATE INDEX ON forecast_hourly (site_id, valid_at DESC);
CREATE INDEX ON truck_dispatch_log (truck_id, decided_at DESC);
```
