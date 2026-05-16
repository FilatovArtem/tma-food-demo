# Human-Only Paths

Project-specific overrides поверх глобальной матрицы
[ai-human-split](~/.claude/memory/ai-human-split.md).

Файлы/директории из этого списка ВСЕГДА `owner: human` при классификации
через `/speckit.classify`, даже если по глобальным критериям получается `ai` или `pair`.

Читается агентом `task-classifier.md`.

## Human-only

- `backend/app/auth/init_data.py` — security-critical HMAC validation. Любой merge только после human review с тестами
- `.env`, `.env.local` — секреты (только human создаёт/обновляет)
- `docs/CLIENT_DEMO.md` — sales-facing, формулировки определяет владелец продукта

## Force-AI (override в обратную сторону)

(нет)

## Правила

- Изменения — через коммит с обоснованием в сообщении
- Для human → ai переходов обязателен хотя бы один test-case
