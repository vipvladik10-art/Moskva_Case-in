# Данные для разработки и демо

| Папка | Содержание | Owner |
|---|---|---|
| `fixtures/` | Эталонные сущности (plants, sites, trucks) для seed БД | E2 |
| `samples/`  | Демо-сценарии погоды для презентации | E3 |

## Загрузка fixtures в БД

```bash
# TODO(P1, S1): CLI-команда `python -m app.cli seed data/fixtures/`
```

## Использование demo_scenarios.yaml

`MockWeatherProvider` принимает имя сценария через переменную `MOCK_WEATHER_SCENARIO`:

```bash
MOCK_WEATHER_SCENARIO=sudden_storm uvicorn app.main:app
```
