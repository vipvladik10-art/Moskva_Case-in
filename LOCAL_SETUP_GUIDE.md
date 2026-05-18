# Локальный запуск проекта с нуля

Этот гайд рассчитан на человека, который впервые запускает проект на новом
компьютере. Ниже есть два способа:

- **Docker-запуск** — проще и ближе к полному окружению проекта.
- **Ручной запуск** — backend и frontend запускаются отдельными командами.

Если сомневаетесь, выбирайте Docker.

---

## 1. Что нужно установить

### Обязательно

1. **Git** — чтобы скачать проект.
   - Скачать: <https://git-scm.com/downloads>
   - При установке можно оставлять настройки по умолчанию.

2. **Node.js LTS** — нужен для frontend.
   - Скачать: <https://nodejs.org/>
   - Лучше ставить LTS-версию, например Node.js 20+.

3. **Python 3.11** — нужен для backend при ручном запуске.
   - Скачать: <https://www.python.org/downloads/release/python-3119/>
   - На Windows обязательно поставьте галочку **Add python.exe to PATH**.
   - Если галочку забыли, обычно можно использовать команду `py` вместо `python`.

4. **Docker Desktop** — нужен для простого запуска всего окружения.
   - Скачать: <https://www.docker.com/products/docker-desktop/>
   - После установки перезагрузите компьютер, если Docker попросит.
   - На Windows Docker может попросить включить WSL2 — соглашайтесь.

### Как проверить, что всё установлено

Откройте PowerShell или терминал и выполните:

```powershell
git --version
node --version
npm --version
py --version
docker --version
docker compose version
```

Если какая-то команда не найдена, значит соответствующая программа не установлена
или не добавлена в `PATH`.

---

## 2. Как скачать проект

Выберите папку, где будут лежать проекты, например `D:\code`, и выполните:

```powershell
cd D:\code
git clone git@github.com:vipvladik10-art/Moskva_Case-in.git
cd Moskva_Case-in
```

Если SSH-ключ для GitHub не настроен, используйте HTTPS:

```powershell
git clone https://github.com/vipvladik10-art/Moskva_Case-in.git
cd Moskva_Case-in
```

---

## 3. Настройка `.env`

В корне проекта есть шаблон `.env.example`. Его нужно скопировать в `.env`.

На Windows PowerShell:

```powershell
copy .env.example .env
```

На macOS/Linux:

```bash
cp .env.example .env
```

После этого откройте файл `.env` в редакторе и проверьте основные значения:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_MAP_TILE_URL=https://tile.openstreetmap.org/{z}/{x}/{y}.png
```

---

## 4. Где взять OpenWeatherMap API key

OpenWeatherMap нужен для реального прогноза погоды и погодных слоёв карты.

1. Откройте <https://openweathermap.org/>.
2. Зарегистрируйтесь или войдите в аккаунт.
3. Перейдите в раздел API keys: <https://home.openweathermap.org/api_keys>.
4. Создайте ключ или используйте уже созданный `Default`.
5. Подождите 10-30 минут: новый ключ иногда активируется не сразу.

В `.env` вставьте ключ в две переменные:

```env
OPENWEATHER_API_KEY=ваш_ключ
VITE_OWM_API_KEY=ваш_ключ
```

Что за что отвечает:

- `OPENWEATHER_API_KEY` использует backend для прогноза и текущей погоды.
- `VITE_OWM_API_KEY` использует frontend для погодных тайлов на карте: осадки,
  облачность, температура, ветер.

Если `VITE_OWM_API_KEY` не задан, слой осадков может использовать fallback
RainViewer. На некоторых масштабах RainViewer может показывать заглушки вроде
`Zoom Level Not Supported`, поэтому для стабильной демонстрации лучше указать
ключ OpenWeatherMap.

Важно: после изменения `.env` перезапустите frontend и backend.

---

## 5. Запуск через Docker

Это самый простой вариант для нового компьютера.

### 5.1. Запустить проект

Из корня проекта:

```powershell
docker compose -f infra/docker-compose.yml up --build
```

Первый запуск может занять несколько минут: Docker скачивает образы и собирает
контейнеры.

После запуска откройте:

- Frontend: <http://localhost:5173>
- Backend API: <http://localhost:8000>
- Swagger-документация API: <http://localhost:8000/docs>

### 5.2. Остановить проект

В терминале, где запущен Docker Compose, нажмите:

```text
Ctrl + C
```

Если нужно полностью остановить и удалить контейнеры:

```powershell
docker compose -f infra/docker-compose.yml down
```

### 5.3. Частые проблемы Docker

**Порт занят**

Если ошибка говорит, что порт `5173`, `8000`, `5432` или `6379` занят, закройте
программу, которая уже использует этот порт, или перезапустите Docker Desktop.

**Docker Desktop не запущен**

Запустите Docker Desktop вручную и дождитесь статуса `Docker is running`.

**Не применились переменные из `.env`**

Перезапустите compose:

```powershell
docker compose -f infra/docker-compose.yml down
docker compose -f infra/docker-compose.yml up --build
```

---

## 6. Ручной запуск без Docker

Этот вариант удобен для разработки, когда нужно отдельно смотреть backend и
frontend.

### 6.1. Backend

Откройте терминал в корне проекта:

```powershell
cd backend
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Если PowerShell запрещает активацию окружения, выполните один раз:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Потом снова:

```powershell
.\.venv\Scripts\Activate.ps1
```

Проверка backend:

- <http://localhost:8000/health> может не работать, потому что API живёт под
  `/api/v1`.
- Открывайте Swagger: <http://localhost:8000/docs>.
- Health endpoint: <http://localhost:8000/api/v1/health>.

### 6.2. Frontend

Откройте второй терминал:

```powershell
cd frontend
npm install
npm run dev
```

Откройте приложение:

```text
http://localhost:5173
```

Frontend отправляет API-запросы на backend по адресу из `.env`:

```env
VITE_API_BASE_URL=http://localhost:8001/api/v1
VITE_API_PROXY_TARGET=http://localhost:8001
```

При `npm run dev` относительные запросы `/api/...` проксируются на `VITE_API_PROXY_TARGET`
(по умолчанию `http://localhost:8001`, если backend в Docker на порту 8001).

---

## 7. Как проверить, что всё работает

1. Откройте <http://localhost:5173>.
2. На карте должны быть участки М-11, АБЗ и погодные бейджи.
3. Справа в панели должна отображаться погодная сводка.
4. Нажмите **Запустить дождь** — один участок должен перейти в состояние дождя,
   а в журнале решений появятся события.
5. Откройте <http://localhost:8000/docs> и проверьте, что Swagger загрузился.

---

## 8. Полезные команды

### Backend

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pytest
ruff check app tests
mypy app
```

### Frontend

```powershell
cd frontend
npm run dev
npm run build
npm run test
```

### Git

```powershell
git status
git pull
git add .
git commit -m "Your message"
git push
```

---

## 9. Что делать, если карта показывает `Zoom Level Not Supported`

Это обычно не проблема базовой карты. Такие плашки может отдавать fallback-слой
RainViewer, если в `.env` не задан `VITE_OWM_API_KEY`.

Решения:

1. В интерфейсе карты выбрать слой погоды **Нет**.
2. Указать `VITE_OWM_API_KEY` в `.env` и перезапустить frontend.
3. Использовать OpenWeatherMap-слои вместо fallback RainViewer.

---

## 10. Мини-чеклист для нового компьютера

```text
[ ] Установлен Git
[ ] Установлен Node.js LTS
[ ] Установлен Python 3.11
[ ] Установлен Docker Desktop
[ ] Репозиторий скачан через git clone
[ ] .env создан из .env.example
[ ] OPENWEATHER_API_KEY добавлен при необходимости
[ ] VITE_OWM_API_KEY добавлен при необходимости
[ ] Проект запущен через Docker или вручную
[ ] Открывается http://localhost:5173
[ ] Открывается http://localhost:8000/docs
```
