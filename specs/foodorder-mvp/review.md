# Review — FoodOrder TMA Demo MVP

## Verdict
APPROVED with MINOR — все user stories реализованы, тесты зелёные, security-критичные пути корректны. Перед демо стоит починить пред-заполнение имени из initData (Order page) и согласовать `INIT_DATA_MAX_AGE` между `.env.example` (86400) и `config.py` default (3600).

## Scoring (each 0-3, ≥10/15 to pass, no zeros)

| Criterion | Score | Notes |
|-----------|-------|-------|
| Correctness | 2/3 | Все 9 US закрыты, но `OrderPage` читает `tgWebAppData.user.first_name` (snake_case на v2-объекте camelCase) → имя никогда не подставляется (US-6 acceptance частично сломан). |
| Maintainability | 3/3 | Чистая слойка `api → services → db`, файлы ≤200 LOC, типизация полная, no dead code, имена явные. |
| Security | 2/3 | HMAC корректен (step order, parse_qsl, compare_digest), 401 на tampered/expired/missing scheme, AI dish_id whitelist, totals на сервере, секреты в env. Минусы: рейт-лимит AI отсутствует (конст. §5 требует, design.md §16 явно отложил — formal deviation), CORS дефолт `web.telegram.org` если env пуст; ngrok-домен и сам Mini App при первой ошибке `.env` молча выключатся. |
| Design | 3/3 | Слой routers/services/auth/infra точно по design.md §5. Lifespan создаёт схему + сидит, `expire_on_commit=False`, BrowserRouter, SDK v2 init-pattern, manualChunks по vendor, гранулярные хуки `useBackButton/useMainButton/useHaptic`. Бот отдельный процесс. |
| Testability | 3/3 | 21/21 passing, init data positive/negative/expired/tampered/scheme/missing, recompute total, whitelist, fallback timeout, invalid JSON, query length boundaries, notify-failure isolation. Mock pattern чистый (monkeypatch `get_openai_client`). |

**Total**: 13/15 (≥10, no zeros). PASS.

## Findings

### CRITICAL
*(none)*

### MAJOR
- [MAJOR] `frontend/src/pages/OrderPage/OrderPage.tsx:13-22` — `getInitialName()` обращается к `(params as { tgWebAppData?: { user?: { first_name?: string } } }).tgWebAppData?.user?.first_name`. У SDK v2 `retrieveLaunchParams()` возвращает `LaunchParams` с `initData.user.firstName` (camelCase, см. `node_modules/@telegram-apps/types/dist/dts/launch-params.d.ts:25` + `init-data.d.ts:20`). `tgWebAppData` отсутствует в типе; cast «as» обманывает TS, в рантайме всегда `undefined` → имя пустое. **Эффект**: US-6 acceptance «Имя предзаполнено из TG initData» не выполняется. **Fix**: `lp.initData?.user?.firstName ?? ''` (либо хранить firstName рядом с `setInitDataRaw` в `api/client.ts` и читать оттуда).
- [MAJOR] `.env.example:29` vs `backend/app/core/config.py:27` — `INIT_DATA_MAX_AGE=86400` в шаблоне env, а default в `Settings` — `3600`. Тесты бегут на 3600 (`conftest.py:24`). На реальном `docker compose up` с `.env` из шаблона окно auth_date станет 24 часа — это противоречит design.md §6 «conscious deviation на 3600 (env-overridable)». Edge case «истёкший init data (>24h)» (spec §7) формально остаётся; «expired test» из tests гарантирует поведение при `-7200s`, но дрейф между документами скрытый. **Fix**: либо снизить в `.env.example` до `3600`, либо явно прокомментировать выбор «демо: сутки чтобы клиент не ловил 401 при паузе».
- [MAJOR] `backend/app/core/config.py:14` — `bot_token: str = Field(..., min_length=1)` обязателен для backend. Spec §7 edge: «Bot token не задан → Bot не стартует, **backend работает**». Сейчас backend тоже падает на старте (`pydantic_core.ValidationError`). Это ломает заявленный edge case; в Docker compose `bot` падает + `backend` тоже падает + healthcheck не проходит + frontend не стартует. **Fix**: сделать `bot_token: str = ""` + при пустом значении просто не использовать (notify через `notify_owner_safe` уже терпит пустой `admin_chat_id`; init_data parse на пустом token делает hash mismatch → 401, что приемлемо для случая «нет токена»). Либо чётко зафиксировать в spec, что обе сервиса нуждаются в токене.

### MINOR
- [MINOR] `backend/tests/test_health.py` — единственный тест `test_health_no_auth_required`. Design.md §15 (test_health.py #2) предписывает также `test_health_db_down_returns_503` — не реализован. Покрытие «503 при упавшей БД» (FR-Reliability) отсутствует.
- [MINOR] `backend/tests/test_init_data.py:47` — `test_url_encoded_user_json_parsed` фактически только дергает `/api/dishes` с валидным заголовком (фикстура `valid_headers`) и проверяет 200. Не проверяет, что URL-encoded `user=%7B...%7D` после `parse_qsl` корректно реконструируется. Спека (design.md §15 init data #7) требует именно проверки URL-decode пути. Сейчас тест мог бы пройти и при сломанной decoder-ветке. **Fix**: внутри теста собирать raw без `urlencode` (raw + manual `quote` user) и сравнивать поведение.
- [MINOR] `frontend/src/pages/OrderPage/OrderPage.tsx:24` — `PHONE_REGEX = /^[\d\s+()-]{10,18}$/` пропускает любые 10-18-значные строки с допустимыми символами (включая non-RU вроде `+1 234 567 890`). Серверный валидатор (schemas/order.py:240) тогда ответит 422 — пользователь увидит generic error. UX-неконсистентность с US-6 («российский формат +7XXXXXXXXXX или 11 цифр»). **Fix**: дублировать серверную нормализацию на фронте (или хотя бы регекс `/^[+78][\d\s()-]{10,16}$/` + проверка 11 цифр после нормализации).
- [MINOR] `backend/app/services/ai.py:50-62` — design.md §7 §4 говорит «1 retry on OpenAIError via tenacity»; в коде только один вызов без retry. На сетевой flap первый запрос упадёт в fallback substring, минуя структурированную выдачу. Не критично (fallback покрывает), но deviation от design.
- [MINOR] `backend/app/main.py:31` — `allow_origins=settings.cors_origins or ["https://web.telegram.org"]`. Если в `.env` забыли CORS_ORIGINS, single fallback покроет основной web-Telegram, но не покрывает iOS/Android клиентский WebView (origin — это домен из BotFather URL, см. research §5: «Telegram WebView sends with the Mini App's own origin»). На практике `tunnel-domain.ngrok-free.app` обязан быть в списке. Документация SETUP.md §6 это упоминает, но дефолт всё равно опасный. **Fix**: при пустом списке предупреждать в логах + не разрешать пустой prod-режим.
- [MINOR] AI rate limit отсутствует. Constitution §Security:5 требует «10 req/min/user». Design.md §16 явно отложил со ссылкой «демо не public, self-limited». Если приоритет — соблюдение конституции буква в букву, нужен короткий middleware (slowapi одной строкой). Документировано — приемлемо для MVP-демо.

### SUGGESTION (nice-to-have, won't block)
- [SUGGESTION] `backend/app/services/order.py:65-68` — `try/except RuntimeError` вокруг `asyncio.create_task` мёртвый код: внутри FastAPI request handler цикл всегда есть, `create_task` не кинет «no running loop». Убрать try/except (или заменить на проверку результата таски через `add_done_callback` с логом исключений — сейчас «Task exception was never retrieved» только в stderr uvicorn).
- [SUGGESTION] `frontend/src/hooks/useMainButton.ts:36` — массив зависимостей перечисляет `options?.onClick`, но `onClick` чаще всего лямбда, пересоздаваемая каждый рендер → effect re-mounts на каждый рендер страницы. Не баг, но потенциально мерцание MainButton'а. Обернуть `onClick` в `useEvent`/ref-pattern или принять reference-stable callback.
- [SUGGESTION] `bot/app/handlers/start.py:22` — приветствие «Привет, {name}!» хорошо, но если `user.first_name` пустой, выпадает «Привет, друг!» — это slang. Можно нейтральнее («Здравствуйте!»). Стилистика, не функционал.
- [SUGGESTION] `frontend/src/pages/AiPickerPage/AiPickerPage.tsx:42-49` — `getDishes()` дёргается каждый раз при AI-поиске. Можно кэшировать в Zustand или передавать из CatalogPage state, сократить latency перед показом recs.
- [SUGGESTION] `backend/app/services/notify.py:39-44` — payload вызова `/sendMessage` не задаёт `parse_mode`. Спец. символы `_*[]()` в имени клиента или комментарии не сломают (нет parse_mode), но Markdown-форматирование тоже не активно. Если в будущем добавите `parse_mode=HTML` — экранируйте имя/коммент.
- [SUGGESTION] `backend/app/db/engine.py:7` — `get_settings()` зовётся при import-time (модульный уровень). В тестах monkeypatch очищает кэш через `get_settings.cache_clear()` (conftest:29), но `engine` уже создан с тестовым URL благодаря порядку. Хрупко: если кто-то добавит import `engine` до setenv — поймает прод-URL. Лучше вынести в фабрику или вычислять в lifespan.

## Coverage check (US/FR from spec)

| Item | Status | Where |
|------|--------|-------|
| US-1: Open menu via bot | ✓ | `bot/app/handlers/start.py:18-47` (CommandStart + WebAppInfo) |
| US-2: Browse catalog | ✓ | `frontend/src/pages/CatalogPage/CatalogPage.tsx`, `components/CategoryTabs/`, `components/DishCard/` |
| US-3: View dish details | ✓ | `frontend/src/pages/DishPage/DishPage.tsx`, BackButton через `useBackButton({to:'/'})` |
| US-4: Add to cart | ✓ | `frontend/src/store/cartStore.ts` (Zustand, не localStorage), `useHaptic().light()` |
| US-5: Edit cart | ✓ | `frontend/src/pages/CartPage/CartPage.tsx` + `components/CartItem/` |
| US-6: Place order | ◐ | `frontend/src/pages/OrderPage/OrderPage.tsx` + `backend/app/api/orders.py` — функционально работает, **но имя не предзаполняется** (см. MAJOR) |
| US-7: AI dish picker | ✓ | `frontend/src/pages/AiPickerPage/AiPickerPage.tsx` + `backend/app/services/ai.py` (strict JSON schema, whitelist, fallback substring) |
| US-8: Owner notification | ✓ | `backend/app/services/notify.py` — fire-and-forget, не валит заказ при упавшем bot API (test_notify_failure_does_not_fail_order ✓) |
| US-9: Status page | ✓ | `frontend/src/pages/StatusPage/StatusPage.tsx`, miniApp.close() с fallback |
| FR-1: All API endpoints | ✓ | `backend/app/api/{health,catalog,orders,ai}.py` — все 7 эндпоинтов |
| FR-2: Init Data validation | ✓ | `backend/app/auth/init_data.py` + `auth/dependencies.py` (Authorization: tma <raw>) |
| FR-3: AI service strict JSON | ✓ | `services/ai.py:23-47` json_schema strict + Pydantic + fallback |
| FR-4: Total recomputed server-side | ✓ | `services/order.py:38-50` + test_orders.py:5-20 |
| FR-5: Bot /start with web_app | ✓ | `bot/app/handlers/start.py` |
| FR-6: Seed at startup if empty | ✓ | `backend/app/db/seed.py` + lifespan в `main.py:18-21` |
| NFR-1: Bundle ≤200KB gz | ✓ | Заявлено 80KB gz, manualChunks vendor split |
| NFR-2: Mobile-first + theme vars | ✓ | `styles/theme.css`, `useTelegramTheme.ts` |
| NFR-3: BackButton + MainButton + Haptic | ✓ | `hooks/{useBackButton,useMainButton,useHaptic}.ts`, per-page wiring (App.tsx routes) |
| NFR-4: Health + graceful + generic errors | ✓ | `/api/health` + ErrorBoundary + `ApiError` обёртка |
| NFR-5: docker compose up single-command | ◐ | Работает при заполненном `.env`. Без `BOT_TOKEN` падает backend (см. MAJOR). README clear. |

## Constitution compliance

| Rule | OK? | Notes |
|------|-----|-------|
| Init Data HMAC на каждом /api/* | ✓ | `require_tg_user` в catalog/orders/ai; `/health` исключён сознательно (FR-2) |
| HMAC step order (WebAppData key, parse_qsl, compare_digest) | ✓ | `init_data.py:30-41` корректно |
| auth_date max age (24h по spec, 3600 по design) | ⚠ | См. MAJOR — расхождение env/code |
| Секреты через env, .env в gitignore | ✓ | pydantic-settings, .env.example без реальных значений |
| CORS — точные origin'ы | ◐ | Конфиг ок, но дефолт при пустом `CORS_ORIGINS` слабый |
| OpenAI prompt injection защита | ✓ | XML-delimiter `<user_query>`, `html.escape`, 200-char cap, strict json_schema, whitelist dish_id |
| Rate limit на AI 10/min/user | ✗ | Отсутствует, design.md §16 явно отложил |
| Backend пересчитывает total | ✓ | `services/order.py:40-50` + tests |
| TTI <2s, bundle ≤200KB gz | ✓ | По данным каллера: ~80KB gz |
| API p95 <300ms, AI <5s | ✓ | aiosqlite + `selectin` + AI 8s timeout |
| Async везде, no sync DB в endpoints | ✓ | `AsyncSession` всюду |
| Pydantic v2 для request/response | ✓ | schemas/*.py, `model_config = ConfigDict(from_attributes=True)` |
| Bot в отдельном процессе | ✓ | `bot/` отдельный image, `python -m app` |
| File size limits (≤250/≤300) | ✓ | Max — OrderPage.tsx 162, ai.py 126 |
| Anti: no localStorage cart | ✓ | `cartStore.ts` чистый Zustand без `persist` |
| Anti: no heavy UI kits | ✓ | CSS Modules, нет MUI/Chakra/Tailwind |
| Anti: no client-trust price | ✓ | order сервис игнорирует price на фронте |
| Anti: no hardcoded tokens | ✓ | Все через `Settings` |

## What's good

- **Чистая архитектура.** Слойка `api/ → services/ → db/`/`auth/` точно по design.md §5, без лишних абстракций (no repository pattern там, где он не нужен). Pragmatism > over-engineering.
- **Init Data HMAC написан учебниково.** `parse_qsl(keep_blank_values=True)`, `hmac.compare_digest`, secret = `HMAC("WebAppData", token)` — step order trap из research §2 учтён.
- **AI service делает всё правильно**: strict JSON schema, server-side whitelist по `menu_ids` (защита от LLM-injection — research §3 top-10 #8), `html.escape` + 200-char cap, fallback на substring matcher → endpoint никогда не возвращает 5xx (FR-3 + edge case OpenAI timeout).
- **Order recompute + snapshot.** Backend пересчитывает `total` по DB, сохраняет `dish_name` + `unit_price` snapshot в `order_items` — нормальная гигиена, никаких изменений цены пост-фактум не сломают историю.
- **Тесты — спецификация в коде.** 21 пройдённых теста ровно по матрице design.md §15 (минус одного health-503). Mock OpenAI через `monkeypatch.setattr(ai_service, "get_openai_client", ...)` — простой паттерн без зависимостей от тяжёлых фреймворков.
- **Frontend bundle.** ~80KB gz при цели ≤200KB — vendor split `react/tg/...`, никакого telegram-ui, никакого axios, fetch + Zustand. Хорошо.
- **Хороший edge-case handling**: notify в fire-and-forget таске не валит заказ, miniApp.close с try/catch для не-Telegram среды, bot предупреждает при отсутствующем WEBAPP_URL.
- **Документация.** README + SETUP.md + CLIENT_DEMO.md — клиенту дать ссылку, всё понятно: получить токен → tunnel → docker compose up.

## End summary

Это качественный MVP-демо. Архитектура соответствует design.md, security-критичные пути (HMAC, totals, prompt injection защита) реализованы правильно, тесты ровно по спеке. Перед демо нужны 2-3 правки: починить `initData.user.firstName` чтение в OrderPage (US-6 имя), синхронизировать `INIT_DATA_MAX_AGE` между env и code, и решить должен ли backend стартовать без `BOT_TOKEN` (spec edge case). Остальное — minor polish.
