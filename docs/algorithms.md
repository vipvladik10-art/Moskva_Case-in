# Алгоритмическое ядро

> Соавторы: **E1** (формулы, нормативы), **P1** (реализация в коде).

## 1. «Зелёное окно»

### Постановка

Дано: участок `S` с координатами, ближайший АБЗ `P`, прогноз погоды на 24 ч
с шагом 1 ч.

Найти: максимальный непрерывный интервал `[t_start, t_end]`, в течение которого:

1. Прогнозируемая интенсивность осадков `precip_mm_h ≤ 0`.
2. Прогнозируемая вероятность осадков `precip_probability ≤ THRESHOLD` (по умолч. 0.3).
3. T воздуха `≥ T_min` (+5 °C, для тонких слоёв +10 °C).
4. Скорость ветра учитывается через таблицу 1 для прогноза остывания.
5. Длительность `t_end − t_start ≥ T_min_work` (мин. время на захватку 100 м).

И параллельно:

6. От момента «сейчас» до `t_start` укладывается **время доставки** `t_deliv`
   (минимум 4 часа — заказ на АБЗ, плюс время в пути).

### Псевдокод

```python
def green_window(
    site: Site,
    plant: Plant,
    forecast: list[HourlyForecast],
    *,
    precip_threshold: float = 0.3,
    min_temp_c: float = 5.0,
    min_duration_min: int = 60,
) -> GreenWindow | None:
    t_deliv = compute_delivery_time(plant, site)   # минуты
    earliest_start = now() + t_deliv

    candidates = []
    cursor_start = None
    for hour in forecast:
        if hour.time < earliest_start:
            continue
        ok = (
            hour.precip_mm_h == 0
            and hour.precip_probability <= precip_threshold
            and hour.temp_c >= min_temp_c
        )
        if ok and cursor_start is None:
            cursor_start = hour.time
        elif not ok and cursor_start is not None:
            candidates.append((cursor_start, hour.time))
            cursor_start = None
    if cursor_start:
        candidates.append((cursor_start, forecast[-1].time))

    candidates = [
        (s, e) for s, e in candidates
        if (e - s).total_seconds() / 60 >= min_duration_min
    ]
    if not candidates:
        return None
    s, e = max(candidates, key=lambda x: x[1] - x[0])
    return GreenWindow(start=s, end=e, plant_id=plant.id, confidence=...)
```

## 2. «Успеть до дождя»

### Цель

Подсказать мастеру: «Закажи N тонн смеси, столько успеешь уложить и уплотнить
до дождя без потерь».

### Параметры

- `t_window` — длительность зелёного окна (часы);
- `t_deliv` — время доставки от АБЗ до участка (часы);
- `t_cool` — время остывания до 80 °C по таблице 1 (часы);
- `П_абз` — производительность АБЗ (т/ч);
- `a, h, ρ` — ширина/толщина/плотность (м, м, т/м³);
- `V` — скорость укладчика (м/мин), по умолчанию из формулы 5.2 техкарты.

### Формула

```
t_useful = t_window − t_deliv − t_cool
T_max   = min(
    П_абз · t_useful,                 # ограничение АБЗ
    a · h · ρ · V · 60 · t_useful     # ограничение укладчика
)
```

### Пример

`t_window = 4 ч`, `t_deliv = 0.75 ч`, `t_cool = 0.8 ч`.
`П_абз = 60 т/ч`, `a = 4 м`, `h = 0.05 м`, `ρ = 2.4 т/м³`, `V = 2.5 м/мин`.

```
t_useful = 4 − 0.75 − 0.8 = 2.45 ч
П_абз  · t_useful = 60 · 2.45 = 147 т
a·h·ρ·V·60·t_useful = 4·0.05·2.4·2.5·60·2.45 = 176.4 т
T_max  = 147 т
```

## 3. Время доставки

```
t_deliv = max(
    ORDER_LEAD_TIME_HOURS,            # минимум 4 часа на заказ
    geo_distance(plant, site) / avg_truck_speed
) + LOAD_TIME_BUFFER
```

`geo_distance` считается в PostGIS:
```sql
SELECT ST_DistanceSphere(plant.geom, site.geom) AS meters;
```

## 4. Время остывания смеси

Считается через таблицу 1 техкарты:

```python
def cooling_time_to_80c(temp_start_c: float, wind_ms: float, base_temp_c: float) -> int:
    """
    Возвращает минуты до остывания слоя до 80 °C.
    Поправки:
      - ветер > 5 м/с: коэффициент 1 + 0.05·(wind − 5)  (эмпирически)
      - T основания < 18 °C: коэффициент 1 + 0.02·(18 − base)
    """
```

Эмпирические коэффициенты — задача E1 валидировать со специалистом
или по дополнительным источникам.

## 5. Динамическое перенаправление самосвалов

Триггер: новый прогноз/радар сообщает `precip > 0` для участка A на ближайший час.

```
1. Получить список самосвалов со статусом en_route, destination=A.
2. Для каждого:
   a) Найти кандидатные участки B, у которых:
      • есть «зелёное окно» сейчас,
      • расстояние truck→B ≤ остаток дальности по таймеру остывания смеси
        (примерно 30–45 мин в зависимости от утепления кузова).
   b) Из кандидатов выбрать ближайший B с максимальным остатком окна.
   c) Если найден → пушнуть водителю новое назначение,
      записать решение в truck_dispatch_log.
   d) Если нет → пометить груз «риск списания», уведомить мастера.
3. Объёмы на участке B уменьшаются на отгрузку прибывающего самосвала.
```

## 6. Планировщик ТО

```
on precipitation_detected(site):
    for machine in idle_machines_near(site, radius=5 km):
        if machine.maintenance_due_within(72h) or random_check_due(machine):
            create_task(MaintenanceTask(machine, type="периодический осмотр"))
            notify(mechanic_on_duty)
```

## 7. Подвоз тех-смесей

| Триггер | Действие |
|---|---|
| Прогноз T < 0 °C на 24 ч | Заказ антифриза для системы катков |
| Начало смены | Заказ керосина (антиадгезионка для бункера) |
| Прогноз грозы | Заказ влагоотводящих покрытий |

Все правила — в `services/supply/rules.py`, легко расширяемы.

## 8. Кейсы для тестов

E1 предоставляет таблицу вход→выход:

| Кейс | Прогноз | Ожидание |
|---|---|---|
| Ясно весь день, +18 °C | rain=0 24h | Окно 24 ч с момента «now+4h» |
| Дождь через 6 ч | rain=2мм/ч на 18:00 | Окно [now+4h .. 18:00] |
| T = +3 °C весь день | rain=0, temp=3 | Окно отсутствует |
| Гроза → ясно → дождь | rain в 12:00 и 20:00 | 2 окна, выбирается длинное |

(см. `backend/tests/test_green_window.py`)
