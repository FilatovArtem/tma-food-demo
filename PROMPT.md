# Задача: Демо Telegram Mini App «FoodOrder»

## Контекст

Это демо-продукт для выхода на рынок фриланс-разработки Telegram Mini Apps. Цель — показать потенциальным клиентам (рестораны, кафе, доставка) работающий продукт, который они могут потрогать прямо в Telegram. Демо должно выглядеть как готовый продукт, а не как учебный проект.

**Бизнес-цель:** после создания демо — публикация кворков на Kwork, прямой обход бизнесов в Telegram с демо-ссылкой, выход на первые заказы.

**Целевая аудитория демо:** владельцы ресторанов/кафе/доставки, которые хотят принимать заказы через Telegram.

## Что нужно сделать

Telegram Mini App — веб-приложение внутри Telegram для заказа еды. Пользователь открывает Mini App через бота, просматривает меню, добавляет блюда в корзину, оформляет заказ. Владелец получает уведомление в Telegram.

**Killer-feature:** AI-подбор блюд — пользователь пишет «что-то лёгкое на обед» или «хочу мясо с гарниром до 500 руб», AI фильтрует меню и предлагает подходящие блюда. Это выделяет из 100% конкурентов на рынке.

## Стек технологий

### Frontend
- **React 18+** + **Vite** + **TypeScript**
- **@telegram-apps/sdk-react** v2 — Telegram Mini Apps SDK
- CSS Modules или Tailwind CSS — адаптивная вёрстка под мобильные
- Никаких тяжёлых UI-библиотек (MUI, Ant Design) — Mini App должен быть лёгким и быстрым

### Backend
- **FastAPI** + **SQLAlchemy 2** (async) + **aiosqlite** (для демо, asyncpg для прода)
- **OpenAI API** (gpt-4o-mini) — AI-подбор блюд
- **Pydantic v2** — валидация

### Telegram Bot
- **aiogram 3** — уведомления владельцу о новых заказах, команда /start с кнопкой открытия Mini App

### Инфраструктура
- **Docker Compose** — один `docker compose up` запускает всё
- Nginx — проксирование frontend + backend
- HTTPS через ngrok/localtunnel для разработки

## Структура проекта

```
tma-food-demo/
├── frontend/
│   ├── src/
│   │   ├── app/              — App.tsx, роутинг, инициализация SDK
│   │   ├── pages/
│   │   │   ├── CatalogPage/  — главная: категории + блюда
│   │   │   ├── DishPage/     — карточка блюда
│   │   │   ├── CartPage/     — корзина
│   │   │   ├── OrderPage/    — оформление заказа
│   │   │   ├── AiPickerPage/ — AI-подбор блюд
│   │   │   └── StatusPage/   — статус заказа
│   │   ├── components/       — переиспользуемые компоненты (DishCard, CartItem, CategoryTabs)
│   │   ├── hooks/            — useCart, useTelegram, useApi
│   │   ├── api/              — fetch-обёртки для backend
│   │   ├── store/            — состояние корзины (zustand или context)
│   │   └── types/            — TypeScript-типы
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── main.py           — FastAPI app, CORS, lifespan
│   │   ├── config.py         — pydantic-settings
│   │   ├── db/
│   │   │   ├── engine.py     — async SQLAlchemy engine
│   │   │   ├── models.py     — Category, Dish, Order, OrderItem
│   │   │   └── repositories.py — CRUD
│   │   ├── api/
│   │   │   ├── catalog.py    — GET /categories, GET /dishes, GET /dishes/{id}
│   │   │   ├── orders.py     — POST /orders, GET /orders/{id}
│   │   │   └── ai.py         — POST /ai/recommend
│   │   ├── services/
│   │   │   ├── order.py      — создание заказа + нотификация
│   │   │   └── ai.py         — AI-подбор блюд через OpenAI
│   │   ├── telegram/
│   │   │   └── notify.py     — отправка уведомлений владельцу через Bot API
│   │   └── auth/
│   │       └── init_data.py  — валидация Telegram Init Data (HMAC-SHA256)
│   ├── data/
│   │   └── seed.json         — демо-меню (10-15 блюд, 3-4 категории, с фото-URL)
│   ├── pyproject.toml
│   └── Dockerfile
├── bot/
│   ├── __main__.py           — aiogram бот: /start с кнопкой Mini App
│   ├── config.py
│   └── Dockerfile
├── docker-compose.yml
├── nginx.conf
├── .env.example
├── CLAUDE.md
└── README.md
```

## Функциональные требования

### 1. Каталог блюд (CatalogPage)
- Табы с категориями (Завтраки, Основные, Салаты, Напитки)
- Карточки блюд: фото, название, описание (1 строка), цена, кнопка «+ В корзину»
- Плавный скролл, лёгкая анимация при добавлении в корзину
- Sticky-header с количеством товаров в корзине

### 2. Карточка блюда (DishPage)
- Большое фото, полное описание, состав, КБЖУ (опционально), цена
- Кнопка «В корзину» с выбором количества

### 3. Корзина (CartPage)
- Список добавленных блюд с +/- и удалением
- Итоговая сумма
- Кнопка «Оформить заказ»
- Если пусто — "Корзина пуста" с кнопкой «К меню»

### 4. Оформление заказа (OrderPage)
- Поля: Имя (предзаполнено из Telegram), Телефон, Комментарий к заказу
- Кнопка «Подтвердить заказ»
- После отправки — StatusPage с номером заказа и сообщением «Ваш заказ принят!»

### 5. AI-подбор блюд (AiPickerPage) — killer feature
- Текстовое поле: «Опишите, что хотите» (примеры: «что-то лёгкое», «мясо с гарниром до 500₽», «без глютена»)
- Кнопка «Подобрать»
- Backend отправляет запрос в OpenAI с контекстом меню → получает список рекомендованных dish_id
- Отображение рекомендованных блюд с пояснением от AI, почему они подходят
- Каждое блюдо можно добавить в корзину

### 6. Уведомление владельцу
- При создании заказа backend отправляет сообщение через Telegram Bot API в чат владельца:
  ```
  🛒 Новый заказ #42
  👤 Артём, +7 999 123-45-67

  • Цезарь с курицей × 2 — 720₽
  • Латте — 280₽

  💰 Итого: 1 000₽
  📝 Комментарий: Без лука, пожалуйста
  ```

### 7. Бот (/start)
- При /start — приветствие + inline-кнопка «Открыть меню» (WebApp button)
- Кнопка открывает Mini App

## Нефункциональные требования

- **Скорость:** Mini App должен открываться < 2 секунд. Минимальный bundle size.
- **Мобильность:** 100% адаптивная вёрстка. Тестировать на экранах 360-428px.
- **Telegram-нативность:** использовать Telegram theme variables (цвета, шрифты) через SDK. Не должно выглядеть как инородное приложение.
- **Валидация Init Data:** каждый запрос к backend содержит Telegram Init Data в заголовке Authorization. Backend валидирует HMAC-SHA256.
- **Без localStorage на фронте:** состояние корзины — в памяти (zustand) или на сервере. localStorage ненадёжен в Telegram WebView на iOS.

## Демо-данные (seed.json)

Создать реалистичное меню из 12-15 блюд в 4 категориях:
- **Завтраки:** Сырники со сметаной (320₽), Авокадо-тост с яйцом (450₽), Овсянка с ягодами (280₽)
- **Основные:** Цезарь с курицей (520₽), Паста карбонара (580₽), Боул с лососем (680₽), Бургер классический (490₽)
- **Салаты:** Греческий (380₽), Тёплый с телятиной (540₽), Капрезе (420₽)
- **Напитки:** Латте (280₽), Свежевыжатый апельсиновый (320₽), Лимонад домашний (250₽), Чай облепиховый (220₽)

Фото: использовать реальные URL изображений из Unsplash (food категория) или placeholder.

## AI-подбор: промпт для OpenAI

```
Ты — AI-помощник ресторана. Пользователь описывает, что хочет, а ты подбираешь блюда из меню.

Меню ресторана:
{menu_json}

Запрос пользователя: "{user_query}"

Верни JSON:
{
  "recommendations": [
    {"dish_id": 1, "reason": "Лёгкий салат с свежими овощами — идеально для лёгкого обеда"},
    ...
  ]
}

Правила:
- Рекомендуй 2-4 блюда
- Учитывай бюджет, если указан
- Если ничего не подходит — верни пустой массив и объяснение
- reason — 1 предложение, на русском
```

## Валидация Telegram Init Data

```python
import hashlib
import hmac
from urllib.parse import parse_qs

def validate_init_data(init_data: str, bot_token: str) -> bool:
    parsed = dict(parse_qs(init_data))
    hash_value = parsed.pop("hash", [None])[0]
    if not hash_value:
        return False

    data_check_string = "\n".join(
        f"{k}={v[0]}" for k, v in sorted(parsed.items())
    )

    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    return hmac.compare_digest(calculated_hash, hash_value)
```

## Дизайн

- Минималистичный, чистый, современный
- Используй Telegram theme CSS variables: `var(--tg-theme-bg-color)`, `var(--tg-theme-text-color)`, `var(--tg-theme-button-color)`, `var(--tg-theme-button-text-color)` и т.д.
- Скруглённые карточки блюд с тенями
- Плавные переходы между страницами
- Фиксированная нижняя панель с кнопкой корзины (badge с количеством)
- AI-подбор: отдельная кнопка «✨ Подобрать с AI» в хедере каталога

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/categories | Init Data | Список категорий |
| GET | /api/dishes | Init Data | Список блюд (фильтр по category_id) |
| GET | /api/dishes/{id} | Init Data | Детали блюда |
| POST | /api/orders | Init Data | Создание заказа |
| GET | /api/orders/{id} | Init Data | Статус заказа |
| POST | /api/ai/recommend | Init Data | AI-подбор блюд |

## .env.example

```env
# Telegram
BOT_TOKEN=your_bot_token_from_botfather
ADMIN_CHAT_ID=your_telegram_user_id

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Backend
DATABASE_URL=sqlite+aiosqlite:///data/app.db
API_HOST=0.0.0.0
API_PORT=8000

# Frontend
VITE_API_URL=/api
```

## Чего НЕ делать

- Не добавлять оплату (это для реальных клиентов, не демо)
- Не добавлять авторизацию по паролю — только Telegram Init Data
- Не использовать тяжёлые фреймворки (MUI, Ant) — Mini App должен быть < 200KB gzipped
- Не делать CMS/полноценную админку — для демо хватит seed.json + уведомлений
- Не хранить состояние в localStorage — ненадёжно в Telegram WebView
- Не усложнять: это MVP за 5-7 дней, не enterprise-продукт

## Критерии готовности

- [ ] `docker compose up` поднимает всё (frontend + backend + bot)
- [ ] Бот по /start показывает кнопку «Открыть меню»
- [ ] Mini App открывается, показывает каталог с категориями
- [ ] Можно добавить блюда в корзину и оформить заказ
- [ ] AI-подбор работает: ввёл «что-то лёгкое» → получил рекомендации
- [ ] Владелец получает уведомление в Telegram о новом заказе
- [ ] Вёрстка адаптивная, выглядит нативно в Telegram
- [ ] Init Data валидируется на каждом запросе
- [ ] README с инструкцией запуска (для показа клиентам и на GitHub)
