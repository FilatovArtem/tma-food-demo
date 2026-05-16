# DEPLOY — продакшен на nixos-home-server

Пошаговая инструкция: от первого push на GitHub до работающего Mini App на `https://foodorder.95.165.71.0.nip.io`. Время: 20-30 минут (большая часть — ожидание Let's Encrypt + build).

Архитектура:

```
GitHub push → main → GitHub Actions
                       │
                       ▼ SSH (appleboy/ssh-action)
                  nixos-home-server (admin@95.165.71.0:22)
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
                  foodorder.95.165.71.0.nip.io
                          ▲
                          │ Mini App URL (BotFather)
                          ▼
                  Telegram client
```

---

## 1. Подготовка GitHub репозитория

### 1.1. Создать репо и запушить

```bash
# Из локального tma-food-demo:
gh repo create tma-food-demo --public --source=. --remote=origin
git push -u origin feat/foodorder-mvp

# Когда готов — merge в main:
git checkout -b main
git merge feat/foodorder-mvp
git push -u origin main
```

Деплой триггерится **на push в `main`**.

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
ssh -i ~/.ssh/foodorder_deploy_key admin@95.165.71.0 'whoami && docker --version'
# → admin
# → Docker version ...
```

### 1.4. Получить host fingerprint (для защиты от MITM в GHA)

```bash
ssh-keyscan -t ed25519 95.165.71.0 2>/dev/null | ssh-keygen -lf - | awk '{print $2}'
# Пример вывода: SHA256:AbCdEfGhIjKlMnOpQrStUvWxYz0123456789
```

Скопировать значение полностью включая `SHA256:`.

### 1.5. Внести GitHub Secrets

В GitHub → репозиторий → Settings → Secrets and variables → Actions → New repository secret:

| Имя | Значение |
|-----|----------|
| `DEPLOY_HOST` | `95.165.71.0` |
| `DEPLOY_PORT` | `22` (можно не задавать — дефолт 22) |
| `DEPLOY_USER` | `admin` |
| `DEPLOY_SSH_KEY` | содержимое `~/.ssh/foodorder_deploy_key` (полностью, **с BEGIN/END строками**) |
| `DEPLOY_HOST_FINGERPRINT` | значение из шага 1.4 |

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
# (после первого деплоя файл появится. Можно вставить заранее — содержимое в docs/DEPLOY.md ниже.)
```

Открыть `/home/admin/nixos/configuration.nix` и **добавить vhost** (admin редактирует файл без sudo):

```nix
services.caddy.virtualHosts."foodorder.95.165.71.0.nip.io" = {
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

Проверка:
```bash
curl -I https://foodorder.95.165.71.0.nip.io/
# Ожидание (до того как frontend запущен):
#   HTTP/2 502 — Caddy достучался, но 127.0.0.1:8080 не отвечает (это нормально до первого деплоя)
# После деплоя:
#   HTTP/2 200
```

### 2.4. Проверить Xray прокси работает

```bash
curl --max-time 5 -x http://127.0.0.1:10808 https://api.telegram.org/
# Ожидание: HTTP 200 (Telegram отдаст HTML с описанием API)

curl --max-time 5 -x http://127.0.0.1:10808 https://api.openai.com/v1/models
# Ожидание: 401 "Invalid API key" — это значит прокси работает, OpenAI отвечает
```

Если не работает — починить Xray до продолжения. Из памяти: конфиг `/etc/xray/config.json`, перезапуск через `sudo systemctl restart xray`.

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
WEBAPP_URL=https://foodorder.95.165.71.0.nip.io

OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o-mini

# CORS — добавить наш домен
CORS_ORIGINS=https://web.telegram.org,https://foodorder.95.165.71.0.nip.io

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
  - URL: `https://foodorder.95.165.71.0.nip.io`

- (опционально) **Configure Mini App**:
  - URL: тот же

После этого внизу чата с ботом появится кнопка-меню.

---

## 5. Первый деплой

Просто push в main:

```bash
git push origin main
```

GitHub Actions запустится автоматически. В UI Actions:
- → Deploy to nixos-home-server → SSH deploy
- Логи покажут: clone → fetch → build → up -d → health check → status

Сборка docker-образов идёт **на сервере** (не в GHA) — занимает 3-5 минут первый раз, потом cached.

После успешного завершения:
```bash
ssh nixos-home-server
cd /home/admin/tma-food-demo
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
# Все три сервиса: backend, frontend, bot — в state Up
```

Проверки:
```bash
# С сервера:
curl http://127.0.0.1:8000/api/health
# → {"status":"ok","db":"ok"}

curl http://127.0.0.1:8080/ -I
# → HTTP/1.1 200 OK

# С локалки/телефона:
curl https://foodorder.95.165.71.0.nip.io/api/health
# → {"status":"ok","db":"ok"}
```

В Telegram открыть бота → `/start` → жмём «🍽 Открыть меню» → Mini App открывается.

---

## 6. Последующие деплои

Просто push в `main`. Дальше всё автоматически.

Откат: создать revert-commit + push, GHA откатит деплой.

Ручной триггер: GitHub UI → Actions → Deploy → Run workflow (выберет main).

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
- Возможные причины: домен не резолвится (для nip.io должен), порт 80 не доступен снаружи (роутер форвардит?), Caddy не запущен после rebuild
- Проверка: `dig foodorder.95.165.71.0.nip.io` должен резолвить в `95.165.71.0`

### Database persisted between deployments?
- Да. `docker-compose.yml` использует named volume `sqlite-data` — переживает `down`/`up`/`build`
- Чтобы сбросить: `docker compose down -v` (удаляет volume!)

---

## 9. Безопасность production-deploy

Что уже сделано:
- SSH ключ только для деплоя (не главный admin-ключ)
- Host fingerprint pinned в GHA — защита от MITM
- `script_stop: true` — любая команда упала → деплой стопится, без частичного состояния
- `concurrency:` — параллельные деплои не конфликтуют
- `.env` с правами 600 на сервере, не уезжает в Git
- Backend uvicorn слушает 127.0.0.1 (не 0.0.0.0) — снаружи доступен только через Caddy → nginx
- CORS ограничен явным списком origins
- Init data HMAC валидируется на каждом /api/* запросе

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

Всё остальное — `git push origin main` и подожди 3-5 минут.
