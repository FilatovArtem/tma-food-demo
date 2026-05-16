# Tasks — FoodOrder TMA Demo MVP

> Source: `design.md`. Track 0 sequential first, then A/B/C parallel. File sets disjoint.

## Quickstart (run after all tracks done)

```bash
cp .env.example .env             # fill BOT_TOKEN, ADMIN_CHAT_ID, OPENAI_API_KEY, WEBAPP_URL
docker compose build
docker compose up

# Health check
curl http://localhost:8080/api/health
# → {"status":"ok","db":"ok"}

# Backend tests
docker compose exec backend pytest -v

# Frontend type-check
docker compose exec frontend sh -c 'cd /app && npm run type-check'  # if dev container
# OR locally: cd frontend && npm i && npm run type-check
```

For BotFather config + ngrok tunnel see `docs/SETUP.md`.

---

## Track 0 — Foundation (sequential, MUST finish first)

**Owner**: developer agent (single, sequential).
**Criteria of done**:
- `docker compose build` succeeds for all 3 services
- `from app.db.models import Category, Dish, Order, OrderItem` imports clean
- `frontend/src/types/api.ts` has all DTOs mirrored from Pydantic
- `cd backend && python -c "from app.core.config import get_settings; get_settings()"` works with `.env`
- Lint configs valid (`ruff check .` not erroring on imports; `eslint .` passes empty src)

### Files (all in Track 0)

**Backend foundation:**
- `backend/pyproject.toml` — deps: fastapi, sqlalchemy[asyncio], aiosqlite, openai, httpx, pydantic-settings, tenacity, python-json-logger, pytest, pytest-asyncio, httpx (tests). Ruff + black + pytest config inline.
- `backend/Dockerfile` — python:3.11-slim, install deps via pip from pyproject, run uvicorn
- `backend/app/__init__.py`
- `backend/app/core/__init__.py`
- `backend/app/core/config.py` — `Settings(BaseSettings)` with: `bot_token`, `admin_chat_id` (Optional[int]), `webapp_url`, `openai_api_key`, `openai_model="gpt-4o-mini"`, `database_url`, `cors_origins` (list[str]), `init_data_max_age=3600`, `log_level="INFO"`. `@lru_cache` get_settings()
- `backend/app/core/logging.py` — stdlib logging.config.dictConfig with python_json_logger
- `backend/app/db/__init__.py`
- `backend/app/db/engine.py` — `create_async_engine(settings.database_url)`, `async_sessionmaker(expire_on_commit=False)`, `get_db()` FastAPI dep
- `backend/app/db/models.py` — Base, TimestampMixin, Category, Dish, Order, OrderItem (full SQLAlchemy 2 typed, see design.md §3)
- `backend/app/db/seed.py` — `async def load_seed_if_empty(session)`: count Dish; if 0 → load JSON, insert categories then dishes, commit
- `backend/app/schemas/__init__.py`
- `backend/app/schemas/category.py` — `CategoryOut`
- `backend/app/schemas/dish.py` — `DishOut`
- `backend/app/schemas/order.py` — `OrderItemIn`, `OrderCreate`, `OrderItemOut`, `OrderOut` (with phone validator)
- `backend/app/schemas/ai.py` — `AIRecommendIn`, `AIRecommendItem`, `AIRecommendOut`
- `backend/app/schemas/health.py` — `HealthOut`
- `backend/app/auth/__init__.py`
- `backend/app/auth/init_data.py` — `TgUser` dataclass, `InitDataError`/`InitDataInvalid`/`InitDataExpired`, `parse_and_verify()` pure function
- `backend/app/auth/dependencies.py` — `require_tg_user` FastAPI dependency
- `backend/app/infra/__init__.py`
- `backend/app/infra/openai_client.py` — module-level `client = AsyncOpenAI(api_key=...)`
- `backend/app/infra/telegram_client.py` — module-level `client = httpx.AsyncClient(base_url=f"https://api.telegram.org/bot{token}", timeout=10.0)`. Lazy init via factory

**Bot foundation:**
- `bot/pyproject.toml` — aiogram>=3.7, pydantic-settings
- `bot/Dockerfile` — python:3.11-slim, install deps, run `python -m app`
- `bot/app/__init__.py`
- `bot/app/config.py` — `Settings(bot_token, webapp_url)`, @lru_cache get_settings

**Frontend foundation:**
- `frontend/package.json` — react@^18.3, react-dom@^18.3, react-router-dom@^6.26, zustand@^4.5, @telegram-apps/sdk-react@^2.0.13, vite@^5.4, @vitejs/plugin-react@^4.3, typescript@^5.6, eslint@^8, prettier@^3, @types/react etc. Scripts: dev, build, type-check (`tsc --noEmit`), lint
- `frontend/tsconfig.json` — strict + noUncheckedIndexedAccess + paths alias `@/*` → `src/*`
- `frontend/vite.config.ts` — react plugin, alias `@/`, manualChunks splitting vendor, target es2020
- `frontend/.eslintrc.cjs`
- `frontend/.prettierrc`
- `frontend/index.html` — root div + viewport meta + theme-color
- `frontend/Dockerfile` — multi-stage: node:20-alpine build → nginx:alpine serve
- `frontend/nginx.conf` — see design.md §13
- `frontend/src/env.ts` — `export const API_URL = import.meta.env.VITE_API_URL ?? '/api'`
- `frontend/src/types/api.ts` — mirrored interfaces: `Category`, `Dish`, `OrderItemIn`, `OrderCreate`, `OrderItemOut`, `Order`, `AIRecommendItem`, `AIRecommendOut`
- `frontend/src/styles/reset.css` — minimal CSS reset
- `frontend/src/styles/theme.css` — root vars (see design.md §11)
- `frontend/src/api/client.ts` — `setInitDataRaw(raw)` setter; `request<T>(path, opts)` fetch wrapper: prepends API_URL, sets `Authorization: tma <raw>`, throws `ApiError` on !ok, parses JSON
- `frontend/src/store/cartStore.ts` — Zustand store (see design.md §9)
- `frontend/src/store/selectors.ts` — count/total/list selectors
- `frontend/src/hooks/useTelegramTheme.ts` — subscribes to themeParams, applies to :root (see design.md §11)

**Root:**
- `docker-compose.yml` — see design.md §12
- (`.env.example`, `.gitignore`, `CLAUDE.md`, `backend/data/seed.json` already exist; verify only)

---

## Track A — Frontend pages/components (parallel, depends on Track 0)

**Owner**: developer agent A.
**Criteria of done**:
- `npm run type-check` passes
- `npm run build` produces `dist/` with JS bundle ≤ 250KB raw (gzipped target 200KB; track 0 manualChunks helps)
- All 6 pages render in dev mode with mock data (no errors)
- BackButton wiring works manually verified or via tsc happy path
- AI picker page calls `/api/ai/recommend` with current cart context

### Files (Track A exclusively touches)

- `frontend/src/main.tsx` — see design.md §11 init sequence
- `frontend/src/App.tsx` — see design.md §10 routes + `useTelegramTheme` + `ErrorBoundary`
- `frontend/src/api/catalog.ts` — `getCategories()`, `getDishes(category_id?)`, `getDish(id)`
- `frontend/src/api/orders.ts` — `createOrder(payload: OrderCreate): Promise<Order>`, `getOrder(id)`
- `frontend/src/api/ai.ts` — `recommend(query: string): Promise<AIRecommendOut>`
- `frontend/src/hooks/useBackButton.ts` — accepts `{ to?: string }`; mounts/unmounts TG BackButton, navigate(-1) or to specific path
- `frontend/src/hooks/useMainButton.ts` — accepts `{ text, onClick, enabled?, color? }`; shows/hides + handles cleanup
- `frontend/src/hooks/useHaptic.ts` — wrappers for impactOccurred / notificationOccurred
- `frontend/src/components/Spinner/Spinner.tsx` + `.module.css` + `index.ts`
- `frontend/src/components/ErrorBoundary/ErrorBoundary.tsx` + `.module.css` + `index.ts`
- `frontend/src/components/EmptyState/EmptyState.tsx` + `.module.css` + `index.ts` — icon/text/action variant
- `frontend/src/components/QtyControl/QtyControl.tsx` + `.module.css` + `index.ts` — `[-][N][+]` control
- `frontend/src/components/DishCard/DishCard.tsx` + `.module.css` + `index.ts` — photo + name + 1-line desc + price + add button
- `frontend/src/components/CategoryTabs/CategoryTabs.tsx` + `.module.css` + `index.ts` — horizontal scroll tabs
- `frontend/src/components/CartItem/CartItem.tsx` + `.module.css` + `index.ts` — list row with QtyControl + remove
- `frontend/src/components/CartFab/CartFab.tsx` + `.module.css` + `index.ts` — floating "Корзина (N)" button at bottom on Catalog/Dish/AiPicker pages, navigates `/cart`
- `frontend/src/pages/CatalogPage/CatalogPage.tsx` + `.module.css` + `index.ts` — fetch categories + dishes, CategoryTabs, DishCard grid, CartFab, "✨ Подобрать с AI" header button → `/ai`
- `frontend/src/pages/DishPage/DishPage.tsx` + `.module.css` + `index.ts` — fetch dish by `:id`, big photo, description, composition, calories, QtyControl, MainButton "Добавить в корзину"
- `frontend/src/pages/CartPage/CartPage.tsx` + `.module.css` + `index.ts` — cart list, total, MainButton "Оформить заказ" / EmptyState if empty
- `frontend/src/pages/OrderPage/OrderPage.tsx` + `.module.css` + `index.ts` — form (name prefilled from `retrieveLaunchParams().user.firstName`, phone, comment), MainButton "Подтвердить"; on success → navigate `/status/{id}`
- `frontend/src/pages/AiPickerPage/AiPickerPage.tsx` + `.module.css` + `index.ts` — input + "Подобрать" button + loading + recommendations list (uses DishCard variant or inline rows with reason text)
- `frontend/src/pages/StatusPage/StatusPage.tsx` + `.module.css` + `index.ts` — fetch order by `:id`, show summary, MainButton "Закрыть" → `miniApp.close()`

---

## Track B — Backend services & API (parallel, depends on Track 0)

**Owner**: developer agent B.
**Criteria of done**:
- `cd backend && pytest -v` runs all tests; ≥18 of 21 passing (some may be skipped if mocks tricky)
- `cd backend && ruff check .` passes
- `cd backend && python -c "from app.main import app"` doesn't crash
- All endpoints listed in spec.md §4 FR-1 exist and return appropriate status codes
- Init data validation kicks in on every `/api/*` except `/health`

### Files (Track B exclusively touches)

- `backend/app/main.py` — `create_app() -> FastAPI`, lifespan (create_all + seed), CORSMiddleware with `settings.cors_origins`, include api_router, mount logging
- `backend/app/services/__init__.py`
- `backend/app/services/order.py` — `create_order(session, payload, tg_user) -> Order`: validate dish_ids, recompute total, snapshot dish_name/unit_price, persist, fire notify task. `get_order(session, id, tg_user_id)`
- `backend/app/services/ai.py` — `recommend(session, query, tg_user) -> list[AIRecommendItem]`: load menu from cache, call OpenAI with strict json_schema, whitelist dish_ids, fallback to substring filter on any failure
- `backend/app/services/notify.py` — `notify_owner(order: Order)`: format multiline RU message with dish list, total, comment; POST sendMessage via telegram_client. Swallow exceptions and log warning
- `backend/app/api/__init__.py` — `api_router = APIRouter(prefix="/api")`; include sub-routers
- `backend/app/api/health.py` — GET `/health`: ping DB (`SELECT 1`), return `HealthOut`. 503 if DB ping fails. **No auth dep.**
- `backend/app/api/catalog.py` — `GET /categories` (sorted by `order`), `GET /dishes?category_id=int|None` (filter is_available=True), `GET /dishes/{id}` (404 if missing). All depend `require_tg_user`. Use AsyncSession directly
- `backend/app/api/orders.py` — `POST /orders` (calls service), `GET /orders/{id}` (returns only if `tg_user_id` matches). Depend on `require_tg_user`
- `backend/app/api/ai.py` — `POST /ai/recommend` (calls service)
- `backend/tests/__init__.py`
- `backend/tests/conftest.py` — fixtures: in-memory engine + session, app instance with overridden `get_db`, `httpx.AsyncClient(transport=ASGITransport)`, `make_init_data(token, user_dict, auth_date_offset=0) -> tuple[str, dict[str, str]]` builder, `valid_auth_headers` fixture
- `backend/tests/test_init_data.py` — see design.md §15 tests #1-7
- `backend/tests/test_orders.py` — see design.md §15 tests #1-6 (notify mocked)
- `backend/tests/test_ai_service.py` — see design.md §15 tests #1-7 (OpenAI mocked)
- `backend/tests/test_health.py` — see design.md §15 tests #1-2

---

## Track C — Bot + Docs + Polish (parallel, depends on Track 0)

**Owner**: developer agent C.
**Criteria of done**:
- `docker compose run --rm bot python -c "from app.bot import build_dispatcher; build_dispatcher()"` doesn't crash
- `/start` handler unit-testable (load `.env`, instantiate Bot, send fake Message → assert kwargs of `answer()` include `web_app` button)
- README has full setup flow with token acquisition steps + tunnel + BotFather config
- `docs/SETUP.md`, `docs/CLIENT_DEMO.md` exist and complete
- BotFather URL config instructions verified against current Telegram docs

### Files (Track C exclusively touches)

- `bot/app/__main__.py` — `asyncio.run(main())`
- `bot/app/bot.py` — `build_bot()`, `build_dispatcher()`, `async def main()` wiring
- `bot/app/handlers/__init__.py`
- `bot/app/handlers/start.py` — `/start` handler with WebApp inline button (see design.md §8)
- `README.md` — root readme: project description, killer-feature callout, 3-step quickstart, link to docs
- `docs/SETUP.md` — detailed: get BOT_TOKEN from @BotFather, get ADMIN_CHAT_ID from @userinfobot or `getUpdates`, get OPENAI_API_KEY from platform.openai.com, ngrok install + run, paste URL into BotFather "Menu Button" + "Web App URL", common troubleshooting (CORS, init data 401, OpenAI 401)
- `docs/CLIENT_DEMO.md` — 60-second pitch script for showing to restaurant owners

---

## Dependencies Graph

```
Track 0 ──┬─→ Track A (frontend pages)
          ├─→ Track B (backend services + tests)
          └─→ Track C (bot + docs)
```

After all tracks finish:

```
[All tracks] ──→ Phase 7 (test run) ──→ Phase 8 (review) ──→ Phase 9 (fix) ──→ Phase 10 (smoke test) ──→ Phase 11 (commits)
```

---

## File Disjoint Check

| Path prefix              | Track |
|---|---|
| `backend/pyproject.toml`, `backend/Dockerfile` | 0 |
| `backend/app/__init__.py`, `backend/app/core/**`, `backend/app/db/**`, `backend/app/schemas/**`, `backend/app/auth/**`, `backend/app/infra/**` | 0 |
| `backend/app/main.py`, `backend/app/services/**`, `backend/app/api/**`, `backend/tests/**` | B |
| `bot/pyproject.toml`, `bot/Dockerfile`, `bot/app/__init__.py`, `bot/app/config.py` | 0 |
| `bot/app/__main__.py`, `bot/app/bot.py`, `bot/app/handlers/**` | C |
| `frontend/package.json`, `frontend/tsconfig.json`, `frontend/vite.config.ts`, `frontend/.eslintrc.cjs`, `frontend/.prettierrc`, `frontend/index.html`, `frontend/Dockerfile`, `frontend/nginx.conf` | 0 |
| `frontend/src/env.ts`, `frontend/src/types/**`, `frontend/src/styles/**`, `frontend/src/api/client.ts`, `frontend/src/store/**`, `frontend/src/hooks/useTelegramTheme.ts` | 0 |
| `frontend/src/main.tsx`, `frontend/src/App.tsx`, `frontend/src/api/{catalog,orders,ai}.ts`, `frontend/src/hooks/{useBackButton,useMainButton,useHaptic}.ts`, `frontend/src/pages/**`, `frontend/src/components/**` | A |
| `docker-compose.yml`, `.env.example`, `.gitignore`, `CLAUDE.md`, `backend/data/seed.json` | 0 (existing or finalized) |
| `README.md`, `docs/**` | C |

**No file appears in more than one track.** ✓
