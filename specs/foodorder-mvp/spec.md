# Spec — FoodOrder TMA Demo MVP

> Источник истины для всех агентов. Тестировщики работают по спеке, НЕ по коду.

## 1. Business Goal

Продаваемое demo-приложение: владельцы общепита открывают ссылку → видят рабочий Mini App → заказывают пилот.

**Success metric демо-сессии (60 сек)**:
1. Клиент открывает Mini App из бота
2. Видит каталог, добавляет 2-3 блюда
3. Использует AI-подбор хотя бы 1 раз
4. Оформляет заказ
5. Владелец демонстрирует уведомление в Telegram

Если хотя бы один шаг ломается — демо проваливается.

## 2. Users & Personas

### P1 — Конечный потребитель (TG user)
Открывает Mini App, заказывает еду. Не админ, не платит — для демо.

### P2 — Владелец общепита (наш клиент)
Не пользуется приложением напрямую. Получает заказы как уведомления в Telegram. Видит демо у нас, заказывает кастомизацию.

### P3 — Разработчик (мы)
Запускает локально, демонстрирует, потом адаптирует под клиента.

## 3. User Stories

### US-1: Open menu via bot
**As a** TG user
**I want** to tap "Open menu" in bot
**So that** Mini App opens with restaurant catalog

**Acceptance**:
- `/start` в боте → сообщение + inline-кнопка "🍽 Открыть меню"
- Тап → открывается Mini App (web_app button)
- Mini App грузится < 2 секунд

### US-2: Browse catalog
**As a** TG user
**I want** to see dishes by category
**So that** I can find what I want

**Acceptance**:
- Каталог открывается на CatalogPage
- Видны категории как табы (Завтраки, Основные, Салаты, Напитки)
- Тап по категории → фильтр блюд
- Карточка: фото, название, описание (1 строка), цена, кнопка "+"
- Sticky-header показывает счётчик корзины

### US-3: View dish details
**As a** TG user
**I want** to tap a dish for details
**So that** I can decide before adding

**Acceptance**:
- Тап по карточке → DishPage
- Большое фото, полное описание, состав, КБЖУ (опц.), цена
- Кнопка "В корзину" с +/- (default 1)
- Telegram BackButton возвращает на каталог

### US-4: Add to cart
**As a** TG user
**I want** to add dishes to cart
**So that** I can order multiple items

**Acceptance**:
- Тап "+" на карточке → добавляется 1 шт в корзину
- Лёгкая анимация (cart bounce / item slide)
- Счётчик в header обновляется
- Cart state в Zustand (НЕ localStorage)

### US-5: Edit cart
**As a** TG user
**I want** to change quantity or remove items
**So that** I can adjust before ordering

**Acceptance**:
- CartPage: список блюд с +/- и кнопкой удалить
- Итоговая сумма обновляется реактивно
- Если корзина пуста → "Корзина пуста" + кнопка "К меню"

### US-6: Place order
**As a** TG user
**I want** to confirm my order
**So that** owner gets notification

**Acceptance**:
- На CartPage кнопка "Оформить заказ" → OrderPage
- Поля: Имя (предзаполнено из TG initData), Телефон (required), Комментарий (опц.)
- Валидация: телефон — российский формат `+7XXXXXXXXXX` или 11 цифр
- Кнопка "Подтвердить" → POST /api/orders → StatusPage с #order_id и "Заказ принят!"
- При ошибке сети — toast / inline error, кнопка retry

### US-7: AI dish picker (killer feature)
**As a** TG user
**I want** to describe what I want in natural language
**So that** I get filtered relevant dishes

**Acceptance**:
- Кнопка "✨ Подобрать с AI" в хедере каталога → AiPickerPage
- Текстовое поле "Опишите, что хотите" + примеры/placeholder
- Кнопка "Подобрать"
- Loading state (spinner / skeleton)
- Результат: 2-4 рекомендованных блюда с пояснением AI
- Каждое блюдо можно добавить в корзину
- Если AI не нашёл → текст "Ничего не подошло" + кнопка "К меню"
- Тайм-аут запроса 10 сек → ошибка с retry

### US-8: Owner notification
**As a** restaurant owner
**I want** to get TG notification on new order
**So that** I can start preparing

**Acceptance**:
- POST /api/orders создаёт заказ + отправляет сообщение в `ADMIN_CHAT_ID`
- Формат:
  ```
  🛒 Новый заказ #42
  👤 Артём, +7 999 123-45-67

  • Цезарь с курицей × 2 — 720₽
  • Латте — 280₽

  💰 Итого: 1 000₽
  📝 Комментарий: Без лука, пожалуйста
  ```
- Если отправка fails — заказ всё равно создан, fail логируется (не падает)

### US-9: Status page
**As a** TG user
**I want** to see order confirmation
**So that** I know it's accepted

**Acceptance**:
- StatusPage: "Заказ #N принят!" + summary + кнопка "Закрыть"
- Закрытие через `Telegram.WebApp.close()` или ссылка обратно в каталог

## 4. Functional Requirements

### FR-1: API endpoints

| Method | Path | Auth | Response |
|--------|------|------|----------|
| GET | `/api/categories` | Init Data | `[{id, name, order}]` |
| GET | `/api/dishes?category_id=` | Init Data | `[{id, name, description, price, photo_url, category_id, composition?, calories?}]` |
| GET | `/api/dishes/{id}` | Init Data | dish detail |
| POST | `/api/orders` | Init Data | `{id, status, total, created_at}` body: `{items: [{dish_id, qty}], name, phone, comment?}` |
| GET | `/api/orders/{id}` | Init Data | order detail |
| POST | `/api/ai/recommend` | Init Data | `{recommendations: [{dish_id, reason}]}` body: `{query: string}` |
| GET | `/api/health` | none | `{status: "ok"}` |

### FR-2: Init Data validation
- Header: `Authorization: tma <init_data_raw_string>`
- Backend парсит, валидирует HMAC-SHA256
- Извлекает `user.id`, `user.first_name`, `user.last_name`, `user.username` в request state
- `auth_date` max age 24h
- На /api/health не валидирует

### FR-3: AI service
- Промпт включает: меню (id, name, description, price, category), user query
- Output: JSON `{recommendations: [{dish_id, reason}]}`
- Pydantic validation. На невалидный JSON — повтор 1 раз, потом fallback с пустыми recs
- Timeout OpenAI: 8s
- Логировать prompt/response для debug (но не PII пользователя)

### FR-4: Order creation
- Backend пересчитывает total по dish_id (не доверяет фронту)
- Сохраняет `tg_user_id` из validated init data
- Транзакция: orders + order_items в одной
- После commit — async-fire telegram notify (не блокирует response)

### FR-5: Bot /start
- /start → текст-приветствие + inline keyboard с `web_app` кнопкой
- URL Mini App из env `WEBAPP_URL`
- Кнопка `web_app` (не `url`!) — обязательно для встроенного открытия

### FR-6: Seed data
- На lifespan startup — если БД пустая → загрузить seed.json
- 4 категории, 14 блюд
- Фото: реальные URL Unsplash food или Picsum

## 5. Non-Functional Requirements

### NFR-1: Performance
- Mini App TTI < 2s на 4G
- JS bundle gzipped ≤ 200KB
- API p95 < 300ms (кроме AI: < 5s)

### NFR-2: Mobile-first
- Viewport 360-428px primary
- Touch targets ≥ 44px
- Используем Telegram theme variables (CSS custom props):
  - `--tg-theme-bg-color`
  - `--tg-theme-text-color`
  - `--tg-theme-button-color`
  - `--tg-theme-button-text-color`
  - `--tg-theme-hint-color`
  - `--tg-theme-link-color`
  - `--tg-theme-secondary-bg-color`

### NFR-3: Telegram-native UX
- BackButton управляется по странице (Catalog → нет, остальные → есть)
- MainButton для CTA где уместно ("Оформить заказ", "В корзину") — опц.
- HapticFeedback при добавлении в корзину
- Viewport API для правильного recompute высоты

### NFR-4: Reliability
- Health endpoint
- Backend graceful shutdown
- Errors не показывают stack trace на фронте — generic message

### NFR-5: Demo-ready
- README с инструкцией < 5 минут setup
- docker compose up должен работать с первого раза
- Демо-скрипт: что показать клиенту по шагам

## 6. Out of Scope

- Платежи
- Несколько ресторанов / multi-tenant
- Доставка / трекинг курьера
- Отзывы, рейтинг блюд
- История заказов пользователя
- Полноценная админка (CMS)
- Промокоды, скидки
- i18n
- Push-нотификации
- Аналитика (PostHog/etc.)
- A/B тесты
- WebSocket / live status

## 7. Edge Cases

| Case | Expected |
|------|----------|
| Невалидный init data | 401 на /api/* |
| Истёкший init data (>24h) | 401 |
| Невалидный dish_id в order | 400 с error |
| Пустая корзина → submit | UI блокирует кнопку |
| OpenAI timeout | Friendly error, retry button |
| OpenAI вернул не-JSON | Retry 1x, потом empty recs |
| Backend down при создании заказа | Inline error, retry |
| Bot token не задан | Bot не стартует, backend работает |
| Owner chat_id не задан | Заказ создаётся, notify skip с warning |

## 8. Demo Script (для клиента)

1. "Сейчас покажу как клиент заказывает у вас"
2. Открываем бот → /start → жмём "Открыть меню"
3. Mini App открывается → "Видите, это меню которое вы редактируете"
4. Тап по категории → "Меню фильтруется"
5. Тап на блюдо → "Детали с фото и описанием"
6. Кладём в корзину → "Корзина в правом верхнем"
7. "А теперь killer-фича — AI подбор"
8. Тап "Подобрать с AI" → пишем "что-то лёгкое до 400 руб"
9. AI рекомендует → "ИИ понимает что нужно клиенту"
10. Добавляем рекомендованное → корзина → оформить
11. Заполняем → подтверждаем
12. *Достаём свой телефон с ботом* → "Вот ваше уведомление с заказом"
13. "Готово. Хотите такой же, под ваш бренд?"

## 9. Success Criteria (для приёмки)

- [ ] `docker compose up` запускает всё (build + start)
- [ ] /start в боте показывает кнопку open menu
- [ ] Mini App грузится в test BotFather URL
- [ ] Каталог отображается с фото и ценами
- [ ] Корзина работает (add, change qty, remove)
- [ ] Order создаётся → уведомление приходит в ADMIN_CHAT_ID
- [ ] AI подбор работает: "что-то лёгкое" → ≥1 рекомендация
- [ ] Init Data валидируется (без неё /api/* → 401)
- [ ] README позволяет повторить setup без вопросов
- [ ] Type check + lint clean
- [ ] 5+ backend тестов passing

## 10. Open Questions (для будущих фич, не блокирует MVP)

- Хранение photo в S3 vs внешние URL — пока URL
- Multi-language — не нужен в MVP
- Категории кастомизируемые — нет, hardcoded в seed.json

---
