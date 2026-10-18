# CLAUDE.md — FoodOrder TMA Demo

> Project memory для Claude Code. Читается автоматически в начале сессии.

## Что это

Demo Telegram Mini App для приёма заказов еды. Цель — продаваемый MVP для выхода на фриланс-рынок (Kwork, прямой обход бизнесов).

Killer feature: **AI dish picker** (естественный язык → подбор блюд из меню через gpt-4o-mini).

## Tech Stack

| Layer | Stack |
|-------|-------|
| Frontend | React 18 + TS + Vite + @telegram-apps/sdk-react v2 + Zustand |
| Backend | FastAPI + SQLAlchemy 2 async + aiosqlite + Pydantic v2 + OpenAI SDK |
| Bot | aiogram 3 |
| Infra | Docker Compose + Nginx |

## Структура

```
tma-food-demo/
├── backend/         FastAPI app + AI service + init data auth
├── frontend/        React Mini App
├── bot/             aiogram 3 bot (/start с WebApp button)
├── specs/           Constitution, spec, design, tasks, review (source of truth)
├── docs/            SETUP, DEPLOY, CLIENT_DEMO
└── docker-compose.yml
```

## Run

```bash
cp .env.example .env  # затем заполнить токены
docker compose up --build
```

Frontend через nginx: http://localhost:8080, API: http://localhost:8080/api
Frontend dev: `cd frontend && npm run dev` (Vite, :5173)
Bot: отдельный процесс, не expose'ит порт

## Git

Ветка по умолчанию - `feat/foodorder-mvp`, ветки `main` нет. Push в неё запускает `.github/workflows/deploy.yml`.

## Ключевые файлы

- `specs/foodorder-mvp/spec.md` — source of truth для всех фич
- `specs/foodorder-mvp/design.md` — архитектура и треки
- `specs/CONSTITUTION.md` — закон проекта
- `backend/app/auth/init_data.py` — HMAC-SHA256 validation (security critical)
- `backend/app/services/ai.py` — AI picker (prompt + JSON validation)
- `frontend/src/store/cartStore.ts` — Zustand cart (НЕ localStorage!)

## Правила (NON-NEGOTIABLE)

- НЕТ localStorage для cart state (iOS Telegram WebView)
- НЕТ доверия к данным с фронта (price, total → пересчёт на backend)
- Init Data валидируется на КАЖДОМ /api/* запросе (кроме /health)
- Секреты только через env, никогда в коде/логах
- НЕТ тяжёлых UI китов (MUI, Ant) — < 200KB bundle target
- Все DB операции async

## Demo Workflow

1. Клиент видит ссылку Mini App или QR
2. Открывает в Telegram → бот /start → "Открыть меню"
3. Заказ → owner notification
4. Закрываем демо предложением кастомизации

См. `specs/foodorder-mvp/spec.md` секция "Demo Script".

## Тесты

```bash
cd backend && pytest
cd bot && pytest
cd frontend && npm test && npm run type-check
```

## Out of Scope

Платежи, multi-tenant, доставка/трекинг, отзывы, история, админка, промокоды, i18n. См. spec.md секция 6.
