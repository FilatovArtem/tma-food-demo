# 🍽 FoodOrder — Telegram Mini App для ресторанов

> Демо-продукт: приём заказов еды прямо в Telegram. С **AI-подбором блюд** по естественному запросу.

[![tech](https://img.shields.io/badge/frontend-React_18_%2B_Vite-61dafb)](https://react.dev)
[![tech](https://img.shields.io/badge/backend-FastAPI_%2B_SQLAlchemy_2-009688)](https://fastapi.tiangolo.com)
[![tech](https://img.shields.io/badge/bot-aiogram_3-2AABEE)](https://docs.aiogram.dev)
[![tech](https://img.shields.io/badge/AI-OpenAI_gpt--4o--mini-412991)](https://platform.openai.com)
[![infra](https://img.shields.io/badge/infra-Docker_Compose-2496ED)](https://docs.docker.com/compose/)

## ✨ Killer feature

Пользователь пишет **«что-то лёгкое до 400 рублей»** — AI читает меню, подбирает 2-4 подходящих блюда с объяснением. Этого нет ни у одного конкурента на Kwork и в локальной доставке.

## Что это

Telegram Mini App, который открывается из бота. Клиент видит каталог блюд, добавляет в корзину, оформляет заказ. Владелец получает уведомление в Telegram.

- 📱 Нативный Telegram WebView — открывается прямо в чате
- 🎨 Адаптация к темной/светлой теме Telegram автоматически
- 🛒 Корзина в памяти (не теряется при свайпе)
- 🤖 AI-подбор блюд через GPT-4o-mini
- 🔔 Уведомления владельцу о новых заказах
- 🔐 Init Data HMAC валидация на каждом запросе

## Tech stack

| Layer | Stack |
|-------|-------|
| **Frontend** | React 18 + TypeScript + Vite + @telegram-apps/sdk-react v2 + Zustand |
| **Backend** | FastAPI + SQLAlchemy 2 (async) + aiosqlite + Pydantic v2 + OpenAI SDK |
| **Bot** | aiogram 3 (polling) |
| **Infra** | Docker Compose + Nginx (reverse proxy) |
| **AI** | OpenAI gpt-4o-mini с strict JSON schema |

## 🚀 Quickstart

### 1. Получить токены и ключи

Подробнейшая инструкция → **[docs/SETUP.md](docs/SETUP.md)**. Кратко:

- `BOT_TOKEN` — у [@BotFather](https://t.me/BotFather) через `/newbot`
- `ADMIN_CHAT_ID` — у [@userinfobot](https://t.me/userinfobot)
- `OPENAI_API_KEY` — на [platform.openai.com](https://platform.openai.com/api-keys)
- `WEBAPP_URL` — HTTPS-туннель (ngrok / cloudflared)

### 2. Заполнить `.env`

```bash
cp .env.example .env
# Открыть .env и заполнить BOT_TOKEN, ADMIN_CHAT_ID, OPENAI_API_KEY, WEBAPP_URL
```

### 3. Запустить

```bash
docker compose up --build
```

Дальше:
- открой бота в Telegram → `/start` → нажми **«🍽 Открыть меню»**
- настрой Mini App URL в [@BotFather](https://t.me/BotFather) (см. SETUP.md)

Health check: `curl http://localhost:8080/api/health`

## 📂 Структура

```
tma-food-demo/
├── backend/          FastAPI + AI + init data auth + tests
├── frontend/         React Mini App (6 экранов)
├── bot/              aiogram бот: /start + WebApp button
├── docs/             SETUP.md, CLIENT_DEMO.md
├── specs/            Конституция, спека, дизайн, ревью
└── docker-compose.yml
```

## 🧪 Тесты

Backend (21 теста: init data HMAC, AI, orders, health):

```bash
cd backend && uv venv && uv pip install -e ".[dev]" && pytest -v
# или внутри Docker:
docker compose exec backend pytest -v
```

Bot (7 тестов: /start, резолв прокси):

```bash
cd bot && uv venv && uv pip install -e ".[dev]" && pytest -v
```

Frontend (21 тест vitest: корзина, API-клиент, CatalogPage) и type-check:

```bash
cd frontend && npm install && npm test && npm run type-check
```

## 🚢 Production deploy

Авто-деплой на homelab NixOS-сервер через GitHub Actions. Ни разу не запускался, статус - в начале [docs/DEPLOY.md](docs/DEPLOY.md):

- push в `feat/foodorder-mvp` (ветка по умолчанию) → GHA SSH-деплой → `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build`
- Caddy на сервере: HTTPS reverse-proxy с Let's Encrypt
- Xray HTTP-proxy для обхода RU-блокировок Telegram/OpenAI
- Host network mode для backend/bot + bound to 127.0.0.1 (доступ только через Caddy)

Полная инструкция: **[docs/DEPLOY.md](docs/DEPLOY.md)** (GHA secrets, SSH ключи, Caddy vhost, troubleshooting).

## 📖 Документация

- **[docs/SETUP.md](docs/SETUP.md)** — пошаговый setup с получением всех токенов
- **[docs/DEPLOY.md](docs/DEPLOY.md)** — production deploy на NixOS-сервер через GHA
- **[docs/CLIENT_DEMO.md](docs/CLIENT_DEMO.md)** — 60-секундный pitch для показа клиентам
- **[specs/foodorder-mvp/spec.md](specs/foodorder-mvp/spec.md)** — функциональные требования
- **[specs/foodorder-mvp/design.md](specs/foodorder-mvp/design.md)** — архитектура (выбор стэка, схемы, треки)
- **[specs/CONSTITUTION.md](specs/CONSTITUTION.md)** — закон проекта

## 🎯 Демонстрация клиенту

См. **[docs/CLIENT_DEMO.md](docs/CLIENT_DEMO.md)** — готовый 60-секундный скрипт продажи.

## 🛠 Кастомизация под клиента

- Меню: правится в `backend/data/seed.json` (14 блюд, 4 категории — замените на меню клиента)
- Тема: автоматически из Telegram, дополнительно `frontend/src/styles/theme.css`
- Текст приветствия бота: `bot/app/handlers/start.py`
- AI промпт: `backend/app/services/ai.py` (`SYSTEM_PROMPT`)
- Логотип/иконки: `frontend/index.html` + assets в `frontend/src/styles/`

## 🚧 Roadmap (post-MVP)

- [ ] Платежи (ЮKassa / Stripe / Telegram Payments)
- [ ] Админка для редактирования меню
- [ ] История заказов пользователя
- [ ] Multi-tenant: один деплой → много ресторанов
- [ ] Push в push-чат + статусы доставки
- [ ] Webhook вместо polling для бота
- [ ] Postgres вместо SQLite для production

## 📄 Лицензия

MIT (для демонстрации). При продаже клиенту — лицензионное соглашение отдельно.

## 💼 Заказать продукт

Telegram: [@artyom](https://t.me/) (укажи свой)
