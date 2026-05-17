# Удобные команды (Linux/macOS/WSL; Windows — выполнять руками или через `make` для Win).
SHELL := /bin/bash

.PHONY: help up down logs ps backend frontend test lint format migrate fmt

help: ## Список команд
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

up: ## Поднять все контейнеры
	docker compose -f infra/docker-compose.yml up -d --build

down: ## Остановить
	docker compose -f infra/docker-compose.yml down

logs: ## Логи backend
	docker compose -f infra/docker-compose.yml logs -f backend

ps: ## Список сервисов
	docker compose -f infra/docker-compose.yml ps

test: ## Юнит-тесты backend + frontend
	cd backend && pytest -q
	cd frontend && npm test

lint: ## Линт
	cd backend && ruff check app tests && mypy app
	cd frontend && npm run lint

format: ## Авто-форматирование
	cd backend && ruff check --fix app tests && ruff format app tests
	cd frontend && npm run format

migrate: ## Применить миграции БД
	docker compose -f infra/docker-compose.yml exec backend alembic upgrade head
