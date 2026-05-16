# SETUP — пошаговое руководство

Полная инструкция: от пустого `.env` до работающего демо в Telegram. Время: 10-15 минут.

---

## 1. Получение BOT_TOKEN

Telegram-бот — обязательное звено. Через него открывается Mini App.

1. В Telegram открой [@BotFather](https://t.me/BotFather)
2. Отправь `/newbot`
3. Укажи **отображаемое имя** бота (например: `FoodOrder Demo`)
4. Укажи **username** — должен заканчиваться на `bot` или `Bot` (например: `foodorder_demo_bot`)
5. BotFather пришлёт токен формата:
   ```
   1234567890:AAEhBP0av5SqXX_XXXXXXXXXXXXXXXX
   ```
6. **Скопируй и сохрани** — это твой `BOT_TOKEN`

Опциональные настройки (через @BotFather → `/mybots` → твой бот):
- `Edit Bot` → `Description` — текст под именем бота
- `Edit Bot` → `About` — короткое описание (на странице бота)
- `Edit Bot` → `Botpic` — аватарка

---

## 2. Получение ADMIN_CHAT_ID

Это твой Telegram user ID — туда придут уведомления о заказах.

**Способ 1 (рекомендуется)** — через `@userinfobot`:

1. Открой [@userinfobot](https://t.me/userinfobot)
2. Нажми `/start` или просто напиши что-нибудь
3. Бот вернёт:
   ```
   Id: 123456789
   First name: Артём
   ...
   ```
4. **Скопируй `Id`** — это твой `ADMIN_CHAT_ID`

**Способ 2** — через Bot API getUpdates:

1. **Сначала** отправь сообщение своему боту (открой его в Telegram, напиши `/start`)
2. Открой в браузере (замени `<BOT_TOKEN>`):
   ```
   https://api.telegram.org/bot<BOT_TOKEN>/getUpdates
   ```
3. В JSON найди:
   ```json
   "chat": { "id": 123456789, ... }
   ```
4. Скопируй число

**Важно**: пока ты не написал боту первым — бот не сможет отправить тебе сообщение. Это ограничение Telegram. Поэтому сразу после первого запуска нажми `/start` своему боту, чтобы открыть чат.

---

## 3. Получение OPENAI_API_KEY

AI-подбор работает через OpenAI gpt-4o-mini.

1. Зайди на [platform.openai.com](https://platform.openai.com)
2. Зарегистрируйся (нужен верифицированный телефон) или залогинься
3. Перейди в [API keys](https://platform.openai.com/api-keys)
4. Нажми **`Create new secret key`**
5. Дай имя (например: `foodorder-demo`)
6. **Скопируй ключ сразу** — больше его не покажут. Формат:
   ```
   sk-proj-abc123...
   ```
7. Пополни баланс: [platform.openai.com/account/billing](https://platform.openai.com/account/billing)
   - Для gpt-4o-mini хватит **$5-10**. Один запрос ≈ $0.0001
   - Карта: международная (РФ Visa/MC не работают — нужна заграничная либо виртуальная через сервис вроде Wise, Genome, EasyPayments)

---

## 4. HTTPS-туннель для Mini App

Telegram требует **HTTPS URL** для Mini App. На локалке поднимаем туннель.

### Вариант A — ngrok (популярный)

1. Скачай [ngrok.com/download](https://ngrok.com/download) под свою ОС
2. Зарегистрируйся на [dashboard.ngrok.com/signup](https://dashboard.ngrok.com/signup)
3. Скопируй токен из [Your Authtoken](https://dashboard.ngrok.com/get-started/your-authtoken)
4. Настрой:
   ```bash
   ngrok config add-authtoken <YOUR_TOKEN>
   ```
5. Запусти туннель (порт 8080 — это наш Mini App):
   ```bash
   ngrok http 8080
   ```
6. Скопируй HTTPS-URL вида:
   ```
   https://abc123.ngrok-free.app
   ```
   Этот URL → `WEBAPP_URL` в `.env`

**Минусы**: на free-плане URL меняется при каждом перезапуске. Обновляй URL и в `.env`, и в BotFather.

### Вариант B — cloudflared (бесплатно навсегда)

macOS:
```bash
brew install cloudflared
cloudflared tunnel --url http://localhost:8080
```

Linux:
```bash
# https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
cloudflared tunnel --url http://localhost:8080
```

Получишь URL `https://random-words.trycloudflare.com`. Тоже меняется при перезапуске.

### Вариант C — localtunnel

```bash
npx localtunnel --port 8080
```

URL: `https://random.loca.lt`. Иногда требует "Click to continue" — для демо неудобно.

**Рекомендация**: ngrok для разработки + cloudflared если нужен стабильный поддомен (через Cloudflare Tunnel с собственным доменом).

---

## 5. Настройка Mini App в BotFather

После того как ты получил HTTPS-URL туннеля — **сообщи его боту через @BotFather**.

1. В Telegram открой [@BotFather](https://t.me/BotFather)
2. `/mybots` → выбери своего бота
3. **`Bot Settings`** → **`Menu Button`** → **`Configure menu button`**
   - Button text: `🍽 Меню`
   - URL: `https://abc123.ngrok-free.app` (твой туннель)
4. Дополнительно (для inline-кнопки в `/start`):
   - **`Bot Settings`** → **`Configure Mini App`**
   - URL: тот же самый

**Перепроверь**: открой бота в Telegram — внизу появится кнопка «🍽 Меню». Тап → Mini App открывается.

---

## 6. Заполнение `.env`

В корне проекта:

```bash
cp .env.example .env
```

Отредактируй `.env`:

```env
# Из шагов 1-2-3-4
BOT_TOKEN=1234567890:AAEhBP0av5SqXX_XXXXXXXXXXXXXXXX
ADMIN_CHAT_ID=123456789
WEBAPP_URL=https://abc123.ngrok-free.app
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o-mini

# Эти можно не трогать
DATABASE_URL=sqlite+aiosqlite:///./data/app.db
API_HOST=0.0.0.0
API_PORT=8000
VITE_API_URL=/api
INIT_DATA_MAX_AGE=86400
LOG_LEVEL=INFO

# CORS: добавь домен туннеля + web.telegram.org
CORS_ORIGINS=https://web.telegram.org,https://abc123.ngrok-free.app
```

---

## 7. Запуск

```bash
docker compose build
docker compose up
```

При первом запуске сборка займёт 2-5 минут. Затем 3 сервиса должны быть `healthy`:

- `tma-food-demo-backend-1` — FastAPI на `:8000` (внутри сети)
- `tma-food-demo-frontend-1` — nginx со static + proxy на `:8080` (наружу)
- `tma-food-demo-bot-1` — aiogram бот

### Проверки

1. **Backend health**:
   ```bash
   curl http://localhost:8080/api/health
   # → {"status":"ok","db":"ok"}
   ```

2. **Бот**: открой бота → `/start` → должна появиться кнопка «🍽 Открыть меню»

3. **Mini App**: нажми «Открыть меню» → откроется каталог из 14 блюд

4. **Заказ end-to-end**: добавь блюдо → оформи заказ → у тебя в Telegram придёт уведомление от бота

---

## 8. Troubleshooting

### Бот не отвечает на `/start`
- `docker compose logs bot` — что в логах?
- `BOT_TOKEN` верный? (попробуй `curl https://api.telegram.org/bot<TOKEN>/getMe` — должен вернуть инфу о боте)
- Бот не блокирован: на сайте Telegram нет блокировки кириллических имён

### Mini App открывается, но `401 Unauthorized` на запросах
- `WEBAPP_URL` правильный? Открывается с того же домена, что в BotFather?
- Туннель живой? (`ngrok` запущен и URL совпадает)
- `INIT_DATA_MAX_AGE`: если меньше 3600 секунд — может протухнуть. Поставь `86400` (сутки)
- Если используешь HashRouter (`#/route`) на фронте — `tgWebAppData` теряется. Должен быть BrowserRouter (у нас так и есть)

### CORS error в консоли браузера
- Добавь домен туннеля в `CORS_ORIGINS` в `.env`. Через запятую без пробелов
- Перезапусти: `docker compose restart backend`

### Уведомления не приходят при заказе
- `ADMIN_CHAT_ID` — число (integer), не строка
- **Открыл ли ты чат с ботом?** Бот не может писать первым — сначала нажми `/start` своему боту
- Логи: `docker compose logs backend | grep notify`

### AI не отвечает / падает в fallback
- `OPENAI_API_KEY` валидный? `curl https://api.openai.com/v1/models -H "Authorization: Bearer <KEY>"`
- Баланс на OpenAI > $0? Проверь [platform.openai.com/account/billing/overview](https://platform.openai.com/account/billing/overview)
- Модель `gpt-4o-mini` доступна? Иногда region-restricted — попробуй через VPN
- Логи: `docker compose logs backend | grep ai`

### `docker compose up` падает с port conflict
- `:8080` занят другим сервисом. В `docker-compose.yml` поменяй `"8080:80"` на `"8081:80"` и обнови туннель: `ngrok http 8081`

### Ngrok URL поменялся
1. Скопируй новый URL
2. Обнови `WEBAPP_URL` и `CORS_ORIGINS` в `.env`
3. `docker compose restart backend bot`
4. Обнови Mini App URL в [@BotFather](https://t.me/BotFather) → `/mybots` → бот → `Bot Settings`

---

## 9. Production deploy (для реальных клиентов)

После того как demo стал реальным заказом — рекомендуемые шаги:

- **Webhook вместо polling** для бота (требует public HTTPS):
  ```python
  await bot.set_webhook(url=f"{base}/tg/webhook")
  ```
- **Postgres** вместо SQLite: `DATABASE_URL=postgresql+asyncpg://user:pass@db:5432/foodorder`
- **CORS_ORIGINS** — точные origin'ы (никаких `*`)
- **Rate-limiting** на `/api/ai/recommend` (slowapi)
- **JSON logging** в централизованный сток (Loki / CloudWatch)
- **VPS deploy** — Hetzner / DigitalOcean / Selectel; собственный домен с Let's Encrypt
- **Менеджер процессов** systemd + Docker Compose с `restart: always`

---

## 10. E2E чек-лист (manual smoke test)

После запуска пройдись по списку:

- [ ] `curl http://localhost:8080/api/health` → 200 `{"status":"ok","db":"ok"}`
- [ ] `/start` в боте → видна кнопка «🍽 Открыть меню»
- [ ] Тап → Mini App открывается **< 2 сек**
- [ ] Каталог: 4 категории как табы (Завтраки, Основные, Салаты, Напитки)
- [ ] 14 блюд с фото и ценами
- [ ] Тап на блюдо → детальная страница (фото, описание, состав, КБЖУ)
- [ ] BackButton возвращает на каталог
- [ ] Добавление в корзину — счётчик в FAB обновляется
- [ ] Открыть корзину → блюда есть, +/- работает
- [ ] «Оформить» → форма (имя предзаполнено)
- [ ] Подтвердить → StatusPage с #номером
- [ ] **В Telegram** прилетело уведомление с заказом
- [ ] Кнопка «✨ Подобрать с AI» — открывается AiPickerPage
- [ ] Ввод «лёгкий салат до 400» → ≥1 рекомендация (через 1-3 сек)
- [ ] Toggle темной темы в Telegram → app перекрашивается без перезагрузки

Всё работает? → можно показывать клиенту. Скрипт демонстрации в [docs/CLIENT_DEMO.md](CLIENT_DEMO.md).
