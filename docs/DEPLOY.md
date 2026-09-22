# DEPLOY — продакшен на nixos-home-server

> **Статус на 2026-09-22: процедура не выполнена ни разу.** История Actions
> репозитория — один автоматический запуск «Dependency Graph Update»; запусков
> job'а `Deploy to nixos-home-server` — ноль. `workflow_dispatch` присутствует
> в `deploy.yml`, то есть ручной запуск был технически возможен и им тоже не
> воспользовались — дело не только в триггере. До 2026-09-22 push-триггер
> дополнительно был битым: целился в ветку `main`, которой в репозитории нет
> (единственная и дефолтная ветка — `feat/foodorder-mvp`); это починено, но
> без реального прогона на сервере с живыми secrets проверить конец в конец
> нельзя — не проверено.
>
> Заявленный ниже адрес Mini App сейчас недоступен: `curl` на него падает на
> TLS. Всё, что в этом файле помечено как «Проверка» / «Ожидание» — это
> описание того, что ДОЛЖНО произойти при выполнении шагов, а не подтверждённый
> факт. Ниже адрес сервера и домен заменены на `<SERVER_IP>` / `<YOUR_DOMAIN>`
> — реальные значения подставляет владелец при выполнении (они уже видны в
> истории коммитов `735aaf7`/`396d60d`, так что это не попытка скрыть их
> задним числом, а просто отказ повторять их здесь как рабочий публичный факт).

Пошаговая инструкция: от push на GitHub до Mini App, доступного по
`https://<YOUR_DOMAIN>` — при условии, что все шаги ниже выполнены и
задеплоено успешно. Ожидаемое время: 20-30 минут (большая часть — ожидание
Let's Encrypt + build), тоже не измерено на практике.

Архитектура (как задумано — куски `docker compose`/Caddy/Xray подтверждены
чтением конфигов, полный путь end-to-end не прогонялся):

```
GitHub push → feat/foodorder-mvp → GitHub Actions
                       │
                       ▼ SSH (appleboy/ssh-action)
                  nixos-home-server (admin@<SERVER_IP>:22)
                       │
                       ▼ /home/admin/tma-food-demo/scripts/deploy.sh
                  docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
                       │
                       ▼ host network mode
                  ┌────────┴────────┐
                  │ :8000 backend  │ ──┐
                  │ :8080 frontend │   │ HTTP_PROXY=127.0.0.1:10808
                  │ bot (polling)  │   ▼
                  └─────────────────┘ Xray → api.telegram.org / api.openai.com
                          ▲
                          │ Caddy 443 (Let's Encrypt) → 127.0.0.1:8080
                          │
                          ▼
                  <YOUR_DOMAIN>
                          ▲
                          │ Mini App URL (BotFather)
                          ▼
                  Telegram client
```

---

## 1. Подготовка GitHub репозитория

### 1.1. Репозиторий и ветка

Репозиторий уже создан и запушен, дефолтная ветка на GitHub —
`feat/foodorder-mvp`. Деплой триггерится **на push в `feat/foodorder-mvp`**
(см. `.github/workflows/deploy.yml`).

Переименование в `main` — по желанию, решение владельца:

```bash
git branch -m feat/foodorder-mvp main
git push -u origin main
# и вернуть branches: [main] в .github/workflows/deploy.yml
```

### 1.2. Сгенерировать SSH-ключ для деплоя

Отдельный ключ ТОЛЬКО для GitHub Actions → ограничивает blast radius.

На локалке:
```bash
ssh-keygen -t ed25519 -f ~/.ssh/foodorder_deploy_key -C "gha-deploy@foodorder" -N ""
```

Получишь:
- `~/.ssh/foodorder_deploy_key` — приватный (пойдёт в GitHub Secret)
- `~/.ssh/foodorder_deploy_key.pub` — публичный (на сервер в authorized_keys)

### 1.3. Установить публичный ключ на сервер

```bash
ssh-copy-id -i ~/.ssh/foodorder_deploy_key.pub nixos-home-server
# или вручную:
cat ~/.ssh/foodorder_deploy_key.pub | ssh nixos-home-server 'cat >> ~/.ssh/authorized_keys'
ssh nixos-home-server 'chmod 600 ~/.ssh/authorized_keys'
```

Проверка:
```bash
ssh -i ~/.ssh/foodorder_deploy_key admin@<SERVER_IP> 'whoami && docker --version'
# Ожидается:
# → admin
# → Docker version ...
```

### 1.4. Получить host fingerprint (для защиты от MITM в GHA)

```bash
ssh-keyscan -t ed25519 <SERVER_IP> 2>/dev/null | ssh-keygen -lf - | awk '{print $2}'
# Пример вывода: SHA256:AbCdEfGhIjKlMnOpQrStUvWxYz0123456789
```

Скопировать значение полностью включая `SHA256:`.

### 1.5. Внести GitHub Secrets

В GitHub → репозиторий → Settings → Secrets and variables → Actions → New repository secret:

| Имя | Значение |
|-----|----------|
| `DEPLOY_HOST` | `<SERVER_IP>` |
| `DEPLOY_PORT` | `22` (можно не задавать — дефолт 22) |
| `DEPLOY_USER` | `admin` |
| `DEPLOY_SSH_KEY` | содержимое `~/.ssh/foodorder_deploy_key` (полностью, **с BEGIN/END строками**) |
| `DEPLOY_HOST_FINGERPRINT` | значение из шага 1.4 |

Ни один из этих secrets на 2026-09-22 не проверялся — не проверено, реальных
значений у меня нет и быть не должно (секреты не в git и не в отчётах).

---

## 2. Подготовка сервера (one-time)

SSH на сервер: `ssh nixos-home-server`

### 2.1. Убедиться, что docker compose v2 доступен

```bash
docker --version
docker compose version
# Если compose v2 не установлен: добавить в configuration.nix:
#   virtualisation.docker.enable = true;
# (admin уже в docker group, sudo не нужен для compose).
```

### 2.2. Подготовить директорию деплоя

```bash
mkdir -p /home/admin/tma-food-demo
# GHA-скрипт сам сделает git clone при первом запуске; ничего больше не нужно.
```

### 2.3. Настроить Caddy reverse-proxy

Скопировать пример vhost в конфиг NixOS:

```bash
# Просмотри snippet
cat /home/admin/tma-food-demo/nix/caddy-foodorder.nix.example
# (после первого деплоя файл появится. Можно вставить заранее — содержимое ниже.)
```

Открыть `/home/admin/nixos/configuration.nix` и **добавить vhost** (admin редактирует файл без sudo):

```nix
services.caddy.virtualHosts."<YOUR_DOMAIN>" = {
  extraConfig = ''
    reverse_proxy 127.0.0.1:8080 {
      header_up X-Real-IP {remote_host}
    }
    encode gzip
  '';
};
```

Применить (нужен пароль для sudo):
```bash
sudo nixos-rebuild switch
```

После rebuild Caddy сам получит Let's Encrypt cert через HTTP-01 challenge на порту 80 (роутер уже форвардит).

Ожидаемый результат (не проверено — деплой не выполнялся):
```bash
curl -I https://<YOUR_DOMAIN>/
# До того как frontend запущен: HTTP/2 502 — Caddy достучался, но 127.0.0.1:8080 не отвечает (это нормально до первого деплоя)
# После деплоя: HTTP/2 200
```

### 2.4. Проверить Xray прокси работает

```bash
curl --max-time 5 -x http://127.0.0.1:10808 https://api.telegram.org/
# Ожидается: HTTP 200 (Telegram отдаст HTML с описанием API)

curl --max-time 5 -x http://127.0.0.1:10808 https://api.openai.com/v1/models
# Ожидается: 401 "Invalid API key" — это значит прокси работает, OpenAI отвечает
```

Если не работает — починить Xray до продолжения. Конфиг `/etc/xray/config.json`, перезапуск через `sudo systemctl restart xray`.

---

## 3. Получить токены и заполнить `.env`

На локалке (или сразу на сервере): см. `docs/SETUP.md` §1-3 для получения:
- `BOT_TOKEN` (через @BotFather)
- `ADMIN_CHAT_ID` (через @userinfobot)
- `OPENAI_API_KEY` (platform.openai.com)

На сервере:
```bash
ssh nixos-home-server
cd /home/admin/tma-food-demo
cp .env.example .env
chmod 600 .env
nano .env  # или vim
```

Заполнить:
```env
BOT_TOKEN=1234567890:AAEhBP...

ADMIN_CHAT_ID=123456789

# Финальный публичный URL Mini App
WEBAPP_URL=https://<YOUR_DOMAIN>

OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o-mini

# CORS — добавить наш домен
CORS_ORIGINS=https://web.telegram.org,https://<YOUR_DOMAIN>

# Остальное — дефолты
DATABASE_URL=sqlite+aiosqlite:///./data/app.db
INIT_DATA_MAX_AGE=3600
LOG_LEVEL=INFO
VITE_API_URL=/api
```

**Важно**: на сервере `.env` создаётся ОДИН РАЗ и потом не трогается GHA-скриптом. `deploy.sh` его не перезаписывает.

---

## 4. Настроить Mini App URL в @BotFather

@BotFather → `/mybots` → твой бот → `Bot Settings`:

- **Menu Button** → `Configure menu button`:
  - Text: `🍽 Меню`
  - URL: `https://<YOUR_DOMAIN>`

- (опционально) **Configure Mini App**:
  - URL: тот же

После этого внизу чата с ботом появится кнопка-меню.

---

## 5. Первый деплой

Push в `feat/foodorder-mvp` (или в `main`, если ветка переименована и триггер обновлён):

```bash
git push origin feat/foodorder-mvp
```

GitHub Actions должен запуститься автоматически — на 2026-09-22 это не
проверено ни разу. В UI Actions ожидается:
- → Deploy to nixos-home-server → SSH deploy
- Логи должны показать: clone → fetch → build → up -d → health check → status

Сборка docker-образов задумана **на сервере** (не в GHA) — ожидается 3-5 минут первый раз, потом cached. Не измерено.

После успешного завершения ожидается:
```bash
ssh nixos-home-server
cd /home/admin/tma-food-demo
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
# Ожидается: все три сервиса (backend, frontend, bot) в state Up
```

Ожидаемые проверки (ни одна не выполнялась):
```bash
# С сервера:
curl http://127.0.0.1:8000/api/health
# Ожидается: {"status":"ok","db":"ok"}

curl http://127.0.0.1:8080/ -I
# Ожидается: HTTP/1.1 200 OK

# С локалки/телефона:
curl https://<YOUR_DOMAIN>/api/health
# Ожидается: {"status":"ok","db":"ok"}
```

В Telegram открыть бота → `/start` → жмём «🍽 Открыть меню» → должен открыться Mini App.

---

## 6. Последующие деплои

Push в триггерную ветку (см. §1.1). Дальше — автоматически, если workflow
однажды отработал успешно; это пока не подтверждено ни одним реальным прогоном.

Откат: создать revert-commit + push, GHA должен откатить деплой (не проверено).

Ручной триггер: GitHub UI → Actions → Deploy → Run workflow (выбрать ветку).

---

## 7. Логи и отладка

На сервере:
```bash
cd /home/admin/tma-food-demo
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f --tail 100 backend
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f --tail 100 bot
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f --tail 100 frontend
```

Caddy:
```bash
journalctl -u caddy -f -n 50
```

Xray:
```bash
journalctl -u xray -f -n 50
```

---

## 8. Troubleshooting

Ничего в этом разделе не встречалось на практике — деплой не запускался ни
разу. Это предположения по конфигурации, а не журнал реальных инцидентов.

### GHA падает с `Permission denied (publickey)`
- Проверь, что публичный ключ деплоя в `/home/admin/.ssh/authorized_keys` на сервере
- Проверь `DEPLOY_SSH_KEY` секрет — содержит ПОЛНЫЙ приватный ключ включая `-----BEGIN OPENSSH PRIVATE KEY-----` и `-----END OPENSSH PRIVATE KEY-----`
- `chmod 600 ~/.ssh/authorized_keys` на сервере

### GHA падает с `Host key verification failed`
- `DEPLOY_HOST_FINGERPRINT` неверный или пустой. Перегенерируй командой из шага 1.4

### Bot не отвечает после деплоя
- Проверь `docker compose logs bot`
- Если `ProxyConnectionError` или таймаут на api.telegram.org — Xray не работает. См. шаг 2.4
- Если `Token validation failed` — `BOT_TOKEN` неверный в `.env`

### Backend 502 от Caddy
- `docker compose ps` — backend в state Up?
- `curl http://127.0.0.1:8080/api/health` — frontend nginx достучался до backend?
- Если `host network` не работает — проверь, что в `docker-compose.prod.yml` есть `network_mode: host`

### AI выдаёт fallback (нет реальных рекомендаций)
- Логи backend — ищи `ai_failed` / `ai.openai_failed`
- Часто: OpenAI API key invalid / out of credit / прокси не работает
- Проверка: `docker compose exec backend curl -x http://127.0.0.1:10808 https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"`

### Mini App открывается, но 401 на запросах
- Проверь, что `WEBAPP_URL` в `.env` совпадает с URL в BotFather **точно** (включая https://)
- Проверь `CORS_ORIGINS` содержит твой домен
- `INIT_DATA_MAX_AGE`: при отладке поставь `86400` (24 часа) — init_data старее 1ч получает 401

### Let's Encrypt не получил cert
- `journalctl -u caddy -n 100` — ищи `tls challenge`
- Возможные причины: домен не резолвится, порт 80 не доступен снаружи (роутер форвардит?), Caddy не запущен после rebuild
- Проверка: `dig <YOUR_DOMAIN>` должен резолвить в `<SERVER_IP>`

### Database persisted between deployments?
- По конфигу — да: `docker-compose.yml` использует named volume `sqlite-data`, который переживает `down`/`up`/`build`. Не проверено на реальном деплое
- Чтобы сбросить: `docker compose down -v` (удаляет volume!)

---

## 9. Безопасность production-deploy

Что верно про сам файл `deploy.yml` (проверяется чтением, не выполнением):
- SSH ключ только для деплоя (не главный admin-ключ) — по инструкции §1.2, использование зависит от владельца
- Host fingerprint pinned в GHA — защита от MITM
- `script_stop: true` — любая команда упала → деплой стопится, без частичного состояния
- `concurrency:` — параллельные деплои не конфликтуют
- Backend uvicorn слушает 127.0.0.1 (не 0.0.0.0) в prod-конфиге — снаружи доступен только через Caddy → nginx (см. `docker-compose.prod.yml`)
- CORS ограничен явным списком origins (по коду `backend/app`)
- Init data HMAC валидируется на каждом /api/* запросе (покрыто тестами `backend/tests/test_init_data.py`)

Что описано как намерение, но не подтверждено выполнением:
- `.env` с правами 600 на сервере — так и должно быть по §3, но сам сервер и файл на нём не осматривались в рамках этой правки

Что стоит добавить позже:
- Rate-limiting на `/api/ai/recommend` (slowapi)
- Структурированные JSON-логи в Loki / Grafana
- Метрики Prometheus
- Daily backup `sqlite-data` volume
- Healthcheck алерт через TG бот в админ-чат

---

## 10. Что НЕ автоматизировано (требует ручного действия)

| Задача | Почему ручное | Когда делать |
|--------|---------------|--------------|
| `sudo nixos-rebuild switch` (Caddy vhost) | admin sudo требует пароль | один раз при добавлении домена |
| Обновление Xray конфига | sudo, секретный конфиг | при смене upstream-proxy |
| Создание `/home/admin/tma-food-demo/.env` | секреты не должны в git/GHA | один раз; обновление при ротации |
| BotFather Menu Button URL | вне сервера | один раз |
| Создание OpenAI API key | вне сервера | один раз; ротация по необходимости |
| Первый реальный прогон этого пайплайна | нужны live secrets и доступ к серверу | до того, как называть деплой рабочим |

Всё остальное — по идее `git push origin feat/foodorder-mvp` и несколько минут
ожидания, но это утверждение о процедуре, а не о подтверждённом результате.
