# Контракт REST API (v1)

Базовый URL: `http://localhost:8000/api/v1`. Полная авто-документация: `/docs` (Swagger).

> Источник истины — OpenAPI, генерируемый FastAPI. Этот документ — для согласования
> между P1 (бэк) и P2 (фронт) до того, как код написан.

## 1. Общие соглашения

- **Аутентификация**: `Authorization: Bearer <token>` (на хакатоне фиксированный).
- **Формат дат**: ISO-8601 UTC (`2026-05-17T14:00:00Z`).
- **Ошибки**: RFC 7807 Problem Details.
- **Пагинация**: `?limit=50&cursor=...`.

## 2. Endpoints

### 2.1 Health

```
GET /health
→ { "status": "ok", "version": "0.1.0", "git_sha": "..." }
```

### 2.2 АБЗ (Plants)

```
GET    /plants                  список
POST   /plants                  создать
GET    /plants/{id}             получить
PATCH  /plants/{id}             обновить
DELETE /plants/{id}             удалить
```

Схема `Plant`:
```json
{
  "id": 1,
  "name": "АБЗ-2 Солнечногорск",
  "location": { "lat": 56.18, "lon": 36.99 },
  "capacity_t_per_hour": 80,
  "active": true
}
```

### 2.3 Участки (Sites)

```
GET    /sites
POST   /sites
GET    /sites/{id}
PATCH  /sites/{id}
```

Схема `Site`:
```json
{
  "id": 5,
  "name": "М-11, км 78–80",
  "location": { "lat": 56.30, "lon": 37.10 },
  "geometry": { "type": "LineString", "coordinates": [...] },
  "lane_width_m": 4.0,
  "layer_thickness_m": 0.05,
  "mix_density_t_m3": 2.4,
  "mix_type": "ЩМА-15",
  "thin_layer": false,
  "preferred_plant_id": 2
}
```

### 2.4 Прогноз

```
GET /sites/{id}/forecast?hours=24
```
Ответ — массив нормализованных часовых прогнозов (см. `docs/data_sources.md` §4).

### 2.5 Зелёное окно

```
POST /sites/{id}/green-window
Body: { "precip_threshold": 0.3, "min_duration_min": 60 }

Ответ:
{
  "site_id": 5,
  "window": {
    "start": "2026-05-17T14:20:00Z",
    "end":   "2026-05-17T17:40:00Z",
    "duration_min": 200
  },
  "plant_id": 2,
  "delivery_time_min": 45,
  "confidence": 0.78,
  "alternatives": [
    { "plant_id": 3, "delivery_time_min": 60, "confidence": 0.81 }
  ]
}
```

### 2.6 Максимальный тоннаж

```
POST /sites/{id}/max-tonnage
Body: { "plant_id": 2 }   # опционально

Ответ:
{
  "site_id": 5,
  "plant_id": 2,
  "t_window_min": 200,
  "t_useful_min": 92,
  "max_tonnage_t": 147.0,
  "limiting_factor": "plant_capacity",   // или "paver"
  "recommended_order_t": 140.0,           // с запасом 5%
  "explanation": "АБЗ ограничивает поставку до 147 т за 92 полезные минуты"
}
```

### 2.7 Самосвалы

```
GET    /trucks                       список
GET    /trucks/{id}
POST   /trucks/{id}/redirect         принудительное перенаправление
GET    /trucks/{id}/history          лог решений
```

`Truck.status ∈ { idle, loading, en_route, waiting, unloading, maintenance }`.

### 2.8 Наряды на ТО

```
GET   /maintenance/tasks?status=open
POST  /maintenance/tasks            создать вручную
PATCH /maintenance/tasks/{id}       закрыть / переназначить
```

### 2.9 Заявки на тех-смеси

```
GET   /supply/orders
POST  /supply/orders
```

### 2.10 WebSocket

```
WS /ws/dashboard
```

Сообщения, которые сервер шлёт клиенту:

```json
{ "type": "truck_position", "truck_id": 17, "lat": ..., "lon": ..., "status": "en_route" }
{ "type": "weather_update",  "site_id": 5, "summary": "rain_starts_in_25min" }
{ "type": "green_window_closed", "site_id": 5 }
{ "type": "redirect", "truck_id": 17, "from_site_id": 5, "to_site_id": 3 }
{ "type": "maintenance_task_created", "task_id": 42, "machine_id": 9 }
```

Клиент может подписываться/отписываться по типам:
```json
{ "action": "subscribe", "topics": ["truck_position", "green_window_closed"] }
```
