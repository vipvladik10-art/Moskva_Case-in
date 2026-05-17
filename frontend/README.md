# Frontend

React 18 + Vite + TypeScript + MapLibre.

## Запуск

```bash
npm install
npm run dev
# http://localhost:5173
```

Прокси `/api` и `/ws` направлены на backend по `http://localhost:8000`,
переопределить можно через `VITE_API_BASE_URL` в `.env`.

## Структура

```
src/
├── api/             ← клиент, хуки TanStack Query, типы
├── components/      ← переиспользуемые UI-блоки
├── pages/           ← страницы маршрутов
├── styles/          ← глобальные стили
└── test/            ← Vitest + Testing Library
```

## Зоны ответственности

Все файлы в `frontend/` — **P2** (frontend-программист).
Mock-данные для разработки до готовности API — **E2**.
