# Архитектура системы

## 1. Контекст (C4, уровень 1)

```
┌────────────────────────────────────────────────────────────────────┐
│                    Метео-планировщик асфальтоукладки               │
│                                                                    │
│   ┌──────────────────┐         ┌──────────────────┐                │
│   │  Диспетчер /     │◄───────►│   Frontend SPA   │                │
│   │  Мастер участка  │  HTTPS  │  (React, mobile) │                │
│   └──────────────────┘         └────────┬─────────┘                │
│                                         │ REST + WebSocket         │
│                                ┌────────▼─────────┐                │
│                                │  FastAPI (ядро)  │                │
│                                └─┬───────┬────────┘                │
│                                  │       │                         │
│                ┌─────────────────┘       └─────────────────┐       │
│                │                                           │       │
│        ┌───────▼────────┐                          ┌───────▼─────┐ │
│        │ PostgreSQL +   │                          │ Redis       │ │
│        │ PostGIS +      │                          │ (кэш, очер.)│ │
│        │ TimescaleDB    │                          └─────────────┘ │
│        └────────────────┘                                          │
│                                                                    │
│                ▲                                                   │
│                │ адаптеры                                          │
│         ┌──────┴───────┬──────────────┬──────────────┐             │
│         │              │              │              │             │
│   ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐       │
│   │OpenWeather│  │ Gismeteo  │  │Tomorrow.io│  │ RadarMap  │       │
│   │   API     │  │    API    │  │    API    │  │   tiles   │       │
│   └───────────┘  └───────────┘  └───────────┘  └───────────┘       │
└────────────────────────────────────────────────────────────────────┘
```

## 2. Контейнеры (C4, уровень 2)

| Контейнер | Технология | Назначение |
|---|---|---|
| `frontend` | React 18 + Vite + TS + MapLibre | SPA для диспетчера и мобильный UI мастера |
| `backend` | Python 3.11 + FastAPI + SQLAlchemy 2 (async) | REST API, бизнес-логика, расчёты |
| `worker` | Python + APScheduler / arq | Фоновые задачи: pull прогнозов, симулятор |
| `db` | PostgreSQL 16 + PostGIS 3.4 + TimescaleDB | Реляционные данные + гео + таймсерии |
| `redis` | Redis 7 | Кэш прогнозов, pub/sub для WebSocket |
| `nginx` (опц.) | Nginx | Реверс-прокси, TLS, отдача статики фронта |

## 3. Компоненты backend (C4, уровень 3)

```
backend/app/
├── api/v1/             ← роуты FastAPI
│   ├── sites.py
│   ├── plants.py
│   ├── trucks.py
│   ├── forecasts.py
│   ├── green_window.py
│   ├── maintenance.py
│   └── ws.py
├── core/               ← конфиг, логирование, безопасность
│   ├── config.py
│   ├── logging.py
│   └── security.py
├── db/                 ← модели и миграции
│   ├── base.py
│   ├── session.py
│   └── models/
│       ├── plant.py
│       ├── site.py
│       ├── truck.py
│       ├── forecast.py
│       ├── maintenance_task.py
│       └── supply_order.py
├── schemas/            ← pydantic
├── services/           ← бизнес-логика
│   ├── weather/
│   │   ├── base.py            ← интерфейс WeatherProvider
│   │   ├── openweather.py
│   │   ├── gismeteo.py
│   │   ├── tomorrowio.py
│   │   ├── normalize.py
│   │   └── ensemble.py        ← объединение прогнозов
│   ├── algorithms/
│   │   ├── green_window.py
│   │   ├── max_tonnage.py
│   │   ├── compaction_time.py ← таблица 1 техкарты
│   │   └── geo.py             ← расстояния, ETA
│   ├── logistics/
│   │   ├── dispatcher.py      ← перенаправление самосвалов
│   │   └── truck_fsm.py
│   ├── maintenance/
│   │   └── trigger.py
│   └── supply/
│       └── rules.py
└── main.py
```

## 4. Поток данных «зелёное окно»

```
1.  Cron worker раз в 5 минут опрашивает 3 провайдера.
2.  Адаптеры приводят к единому формату (нормализация).
3.  Ensemble объединяет (медиана + взвешенное по точности).
4.  Сохраняется в TimescaleDB как hypertable `forecast_hourly`.
5.  Когда фронт запрашивает `GET /api/v1/sites/{id}/green-window`:
    a) GreenWindowService берёт прогноз для координат участка,
    b) GeoService считает время доставки от ближайшего АБЗ,
    c) применяет правила (T возд, вероятность осадков, длительность),
    d) возвращает интервал + confidence + альтернативные АБЗ.
6.  Параллельно WebSocket pushит изменения по подписанным клиентам.
```

## 5. Развёртывание

Для хакатона — Docker Compose на одной машине (см. `infra/docker-compose.yml`).
В прод-варианте: Kubernetes + Managed Postgres + S3 для тайлов радара
(вне рамок проекта).

## 6. Решения, оставленные на «потом»

- Аутентификация: на хакатон — простой Bearer-токен из `.env`. Прод — Keycloak.
- Multi-tenant (несколько подрядчиков): не входит в MVP.
- Реальный GPS-канал самосвалов: на демо — симулятор.
