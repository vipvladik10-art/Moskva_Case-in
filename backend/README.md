# Backend

FastAPI-сервис: REST API, погодные адаптеры, расчётное ядро, WebSocket.

## Запуск локально

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example ../.env
uvicorn app.main:app --reload --port 8000
```

Открыть: <http://localhost:8000/docs>.

## Миграции БД

```bash
# первая миграция
alembic revision --autogenerate -m "init schema"
alembic upgrade head
```

## Тесты

```bash
pytest -v
ruff check app tests
mypy app
```

## Структура

См. [`../docs/architecture.md`](../docs/architecture.md) §3.

## Зоны ответственности

| Модуль | Owner |
|---|---|
| `app/services/weather/*` | E2 |
| `app/services/algorithms/*` | P1 (код) + E1 (ревью формул) |
| `app/services/logistics/*` | P1 |
| `app/api/v1/*` | P1 |
| `alembic/` | P1 + E3 |
