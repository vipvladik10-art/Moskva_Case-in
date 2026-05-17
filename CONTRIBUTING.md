# Как мы работаем над кодом

## Ветки

- `main` — всегда зелёный, защищён, мерж только через PR с 1 апрувом.
- `develop` — интеграционная ветка спринта (опционально, если PR-flow тяжёл).
- `feat/<scope>-<short-name>` — фичи (`feat/backend-green-window`).
- `fix/<scope>-<short-name>` — баги.
- `docs/<short-name>` — только документация.
- `chore/<short-name>` — инфраструктура, зависимости.

## Коммиты — Conventional Commits

```
feat(backend): add green-window calculator
fix(frontend): correct map projection
docs(tech_process): clarify compaction thresholds
chore(infra): bump postgres image to 16
test(weather): add VCR fixtures for OpenWeather
```

Допустимые `type`: `feat`, `fix`, `docs`, `chore`, `test`, `refactor`, `perf`.

## Pull Request

1. Опиши «зачем» в первом абзаце, а не «что».
2. Прикрепи скриншот/гиф, если меняешь UI.
3. Прогони локально: `make lint test` (см. `Makefile`).
4. Назначь ревьюера согласно [TEAM.md](./TEAM.md) — владельца модуля.
5. Привяжи Issue: `Closes #42`.

## Стиль кода

### Python (backend)
- `ruff` (lint + format), `mypy --strict`.
- Pydantic-схемы — отдельно от моделей БД.
- Все формулы из ГОСТ — с docstring-ссылкой на пункт техкарты.

### TypeScript (frontend)
- `eslint` + `prettier`.
- React-компоненты — функциональные, hooks.
- Состояние сервера — TanStack Query, локальное — Zustand.

## Тесты

- Backend: `pytest`, фикстуры — `tests/conftest.py`.
- Внешние API — через `vcrpy`, никаких реальных запросов в CI.
- Критичные формулы — таблица «вход → ожидаемый выход» (E1 даёт значения).
- Frontend: `vitest` + `@testing-library/react`.

## Документация

- Любое изменение публичного контракта API → обновить `docs/api_spec.md`.
- Любое изменение формулы → обновить `docs/algorithms.md` и `docs/tech_process.md`.
- E1 ревьюит изменения в `docs/tech_process.md`.

## Релизы

В рамках хакатона релизы тегаются по спринтам: `v0.1.0` (S1), `v0.2.0` (S2),
`v0.3.0` (S3), `v1.0.0` (финал).
