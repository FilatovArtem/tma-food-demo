# Backlog
<!-- Updated: 2026-09-22 | Milestones с дедлайнами → TickTick, детальные задачи → здесь -->

## In Progress

## Next

- [ ] CI-1: workflow, который реально гоняет тесты
      Files: `.github/workflows/ci.yml` (новый)
      Criteria: push/PR запускает `backend: .venv/bin/python -m pytest -q`,
                `frontend: npm run type-check && npm test`, `bot: pytest`;
                зелёный прогон виден в GitHub Actions
      Note: единственный существующий workflow — `deploy.yml`. 21 backend-тест
        + добавленные в этой сессии 21 frontend + 7 bot тестов сейчас гоняются
        только руками, ни разу в CI

- [ ] CI-2: первый реальный прогон deploy.yml
      Criteria: push в `feat/foodorder-mvp` запускает job "Deploy to
                nixos-home-server" зелёным; `curl https://<YOUR_DOMAIN>/api/health`
                отвечает `{"status":"ok","db":"ok"}`
      Note: триггер (branches: [main] → [feat/foodorder-mvp], DEPLOY_BRANCH
        из github.ref_name) починен 2026-09-22 — до этого сработать не мог
        вообще, ветки main в репозитории нет. Нужны живые secrets
        (DEPLOY_HOST/DEPLOY_SSH_KEY/...) и доступ к серверу — вне того, что
        чинится локально в файле
      Depends: GitHub Secrets из `docs/DEPLOY.md` §1.5 заведены владельцем

- [ ] TEST-1: тесты checkout-пути во фронтенде (OrderPage/DishPage)
      Files: `frontend/src/pages/OrderPage/OrderPage.tsx`,
             `frontend/src/pages/DishPage/DishPage.tsx`
      Criteria: тест на успешный submit заказа (createOrder resolves →
                переход на статус) и на ошибку API при submit (ApiError
                показан пользователю, форма не теряет данные)
      Note: добавленные в этой сессии тесты покрыли корзину, API-клиент и
        состояния CatalogPage — сам экран оформления заказа (там, где
        реально считается total к отправке) пока не покрыт

## Later

- [ ] ARCH-1: две копии constitution — выбрать один источник
      Files: `specs/CONSTITUTION.md` (в git), `.specify/memory/constitution.md`
             (untracked)
      Criteria: остаётся один файл, второй — либо симлинк, либо удалён
      Note: файлы побайтово идентичны (`diff` пуст). CLAUDE.md ссылается на
        `.specify/memory/constitution.md`, но в git закоммичен только
        `specs/CONSTITUTION.md` — при правке одного без другого разъедутся

- [ ] ARCH-2: `.claude/`, `.specify/`, `CLAUDE.md`, `backend/uv.lock` никогда не коммитились
      Criteria: осознанное решение — закоммитить или явно занести в
                `.gitignore` (сейчас не то и не другое: untracked с самого
                первого коммита `c1aefe0`)
      Note: `backend/uv.lock` не влияет на прод-сборку (Dockerfile ставит
        `pip install .` из pyproject, не читает lock-файл) — риск только для
        воспроизводимости локального venv

- [ ] DOC-1: CLAUDE.md — устаревшие ссылки на файлы/команды
      Files: `CLAUDE.md` (untracked, см. ARCH-2)
      Criteria: `frontend/src/store/cart.ts` → `frontend/src/store/cartStore.ts`;
                `npm run typecheck` → `npm run type-check`; секция «Тесты»
                пополнена `cd frontend && npm test` и `cd bot && pytest`
      Note: не тронуто в этой сессии — файл сам по себе untracked (ARCH-2),
        править контент до решения о трекинге показалось преждевременным

- [ ] FRONT-1: нет общей функции форматирования цены
      Files: `frontend/src/components/DishCard`, `CartItem`, `CartFab`,
             `frontend/src/pages/OrderPage`, `CartPage`, `DishPage`, `StatusPage`
      Criteria: одна функция `formatPrice(n)` вместо `{value}₽`,
                продублированного в 8 местах; на четырёхзначных ценах
                (`4500₽`) разделитель тысяч на усмотрение владельца
      Note: не баг — сейчас во всех 8 местах поведение одинаковое и
        корректное для demo-каталога (двух-трёхзначные цены). Задание просило
        протестировать «форматирование цен» — тестировать нечего, функции
        нет; вместо неё тестами покрыт расчёт total (`selectCartTotal`)

## Done

- [x] TEST-2: тесты фронтенда — vitest 3.2.7 + jsdom + RTL, 21 тест на
      cartStore/selectors, `request()` в api/client, три состояния CatalogPage
      (спиннер/успех/ошибка). Падение доказано точечной мутацией продакшен-кода
      по каждому из трёх файлов, откат проверен `git diff --stat` — 2026-09-22
- [x] TEST-3: тесты бота — pytest + pytest-asyncio, 7 тестов на ветвление
      `on_start` (webapp настроен/нет, fallback имени) и `_resolve_proxy`
      (приоритет HTTPS_PROXY над HTTP_PROXY). Тот же цикл падение → откат →
      зелёный — 2026-09-22
- [x] CI-3: `deploy.yml` починен — триггер на `feat/foodorder-mvp` вместо
      несуществующего `main`, `DEPLOY_BRANCH` на сервере теперь берётся из
      `github.ref_name` вместо тихого фолбэка на `main`. Синтаксис
      провалидирован (`yaml.safe_load`), реальный прогон — CI-2 — 2026-09-22
- [x] DOC-2: `docs/DEPLOY.md` приведён в соответствие с фактом «ни разу не
      задеплоено» — статус-блок, «Проверка» → «Ожидается (не проверено)»,
      адрес сервера и домен заменены на `<SERVER_IP>`/`<YOUR_DOMAIN>` — 2026-09-22
