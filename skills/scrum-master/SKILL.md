---
name: scrum-master
description: Personal scrum master with Google Tasks/Calendar integration and coaching focus. Daily standups, task tracking, weekly reviews, and accountability.
metadata: {"clawdbot":{"emoji":"🎯","requires":{"bins":["gog","jq"]}}}
---

# Scrum Master 🎯

Персональный scrum master с коучинговым подходом. Интеграция с Google Tasks и Calendar.

## Быстрый старт

```bash
# Проверить зависимости
bash {baseDir}/scripts/deps_check.sh

# Проверить подключение
bash {baseDir}/scripts/verify.sh

# Проверить задачи
bash {baseDir}/scripts/standup.sh

# Прогресс
bash {baseDir}/scripts/progress.sh

# Дедлайны
bash {baseDir}/scripts/due_check.sh
```

## Возможности

### 💡 Inbox & Closet (NEW)
- **Inbox** — brain dump для будущих идей без обязательств
- **Closet** — permanent storage без review pressure
- **Promote** — inbox → active task за одну команду
- Отдельные от scrum-цикла (не влияют на weekly review)

### 📋 Task Management
- Синхронизация с Google Tasks через `gog`
- Приоритизация по тегам: `[P1]`, `[P2]`, `[P3]`
- Трекинг заблокированных задач
- Экспорт в CSV

### 📊 Progress Tracking
- Статистика выполнения (done/pending/overdue)
- Процент выполнения с визуальным прогресс-баром
- Streaks и gamification (badges)

### 📅 Calendar Integration
- Time blocking для задач
- Цветовая маркировка по приоритету

### 🏋️ Coaching
- Отслеживание просроченных задач
- Напоминания о дедлайнах
- Celebrate wins

---

## Скрипты

### inbox.sh — Управление inbox
```bash
# Просмотр inbox
bash {baseDir}/scripts/inbox.sh list

# Добавить идею
bash {baseDir}/scripts/inbox.sh add "Идея для контента HyperEVM"

# Добавить с заметкой (для reply context)
bash {baseDir}/scripts/inbox.sh add-note "Основной текст" "Контекст из чата"

# Получить конкретный item
bash {baseDir}/scripts/inbox.sh get inbox-123

# Удалить
bash {baseDir}/scripts/inbox.sh remove inbox-123
```

**Output (list):**
```json
{
  "count": 3,
  "items": [
    {
      "id": "inbox-001",
      "text": "Идея для контента HyperEVM",
      "source": "manual",
      "created_at": "2026-01-30T01:45:00Z",
      "note": null
    }
  ]
}
```

### closet.sh — Управление closet
```bash
# Просмотр closet
bash {baseDir}/scripts/closet.sh list

# Добавить в closet
bash {baseDir}/scripts/closet.sh add "Текст" "Заметка" "manual" "inbox-123"

# Удалить из closet
bash {baseDir}/scripts/closet.sh remove closet-456
```

### promote.sh — Inbox → Active Task
```bash
# Превратить inbox item в Google Task
bash {baseDir}/scripts/promote.sh inbox-123

# С дедлайном
bash {baseDir}/scripts/promote.sh inbox-123 "2026-02-01"
```

**Что происходит:**
1. Создаёт задачу в Google Tasks
2. Переносит note в поле notes задачи
3. Удаляет item из inbox

**Output:**
```json
{
  "status": "promoted",
  "inbox_id": "inbox-123",
  "task_title": "Идея для контента HyperEVM"
}
```

### uncloset.sh — Closet → Inbox
```bash
# Вернуть из closet в inbox
bash {baseDir}/scripts/uncloset.sh closet-456
```

**Что происходит:**
1. Добавляет item обратно в inbox
2. Сохраняет note если был
3. Удаляет из closet

---

### verify.sh — Проверка подключения
```bash
bash {baseDir}/scripts/verify.sh
```

**Output:**
```json
{
  "status": "ok",
  "list_id": "...",
  "task_count": 5,
  "data_dir": "$SCRUM_DATA_DIR"
}
```

### deps_check.sh — Проверка зависимостей
```bash
bash {baseDir}/scripts/deps_check.sh
```

Проверяет версии gog и jq против `deps.lock`.

### standup.sh — Утренний стендап
```bash
bash {baseDir}/scripts/standup.sh [account]
```

Возвращает JSON с незавершёнными и срочными задачами.

**Output:**
```json
{
  "date": "2026-01-23",
  "total_incomplete": 5,
  "urgent_count": 2,
  "tasks": [...],
  "urgent": [...]
}
```

### progress.sh — Статистика прогресса
```bash
bash {baseDir}/scripts/progress.sh [list_id]
```

**Output:**
```json
{
  "total": 10,
  "done": 7,
  "pending": 3,
  "overdue": 1,
  "due_today": 2,
  "percent_complete": 70
}
```

**Формат отображения:**
```
📊 Прогресс: 7/10 задач (70%)
██████████████░░░░░░ 70%
✅ Done: 7 | ⏳ Pending: 3 | ⚠️ Overdue: 1
```

### due_check.sh — Проверка дедлайнов
```bash
bash {baseDir}/scripts/due_check.sh [list_id]
```

**Output:**
```json
{
  "due_today": [...],
  "due_today_count": 2,
  "due_tomorrow": [...],
  "due_tomorrow_count": 1,
  "overdue": [...],
  "overdue_count": 3
}
```

### timeblock.sh — Блокировка времени в календаре
```bash
bash {baseDir}/scripts/timeblock.sh "Task title" "2026-01-24T10:00" "2026-01-24T12:00" [color]
```

**Цвета:**
- `4` (flamingo) — P1 urgent
- `5` (banana) — P2 important  
- `9` (blueberry) — default
- `10` (basil) — done/review

### blocked.sh — Управление заблокированными задачами
```bash
# Список заблокированных
bash {baseDir}/scripts/blocked.sh list

# Заблокировать
bash {baseDir}/scripts/blocked.sh add <task_id> "Причина"

# Разблокировать
bash {baseDir}/scripts/blocked.sh remove <task_id>
```

### streaks.sh — Streaks и gamification
```bash
# Текущий streak
bash {baseDir}/scripts/streaks.sh check

# Зафиксировать выполнение задачи
bash {baseDir}/scripts/streaks.sh complete

# Показать badges
bash {baseDir}/scripts/streaks.sh badges
```

**Badges:**
- 🔥 `week_streak` — 7 дней подряд
- 🏆 `month_streak` — 30 дней подряд
- 💯 `century` — 100 задач всего

**При выполнении задачи показывать:**
```
🎉 Задача выполнена!
🔥 Streak: 5 дней | 💯 Всего: 42 задачи
```

### export_csv.sh — Экспорт в CSV
```bash
# Экспорт за последние 7 дней
bash {baseDir}/scripts/export_csv.sh 7

# Экспорт за месяц
bash {baseDir}/scripts/export_csv.sh 30
```

Файлы сохраняются в: `$SCRUM_DATA_DIR/exports/`

---

## Inbox & Closet Workflow

### Концепция

**Три отдельных петли:**

1. **Inbox** — brain dump без обязательств
   - Добавляй идеи когда угодно
   - Просматривай когда хочешь (не по расписанию)
   - Promote → task когда готов действовать

2. **Active Tasks** — scrum workflow
   - Daily standups
   - Weekly reviews
   - Sprint execution
   - *Inbox не попадает сюда автоматически*

3. **Closet** — permanent storage
   - Идеи "когда-нибудь, может быть"
   - Без guilt, без review pressure
   - Можно вернуть в inbox когда актуализируется

### Типичные сценарии

**Brain dump в Telegram:**
```
User: [видит интересную идею в чате]
User: /inbox  (reply на сообщение)
→ Clawd: 💡 Inboxed: [текст сообщения]
```

**Добавить свою идею:**
```
User: /inbox Сделать гайд по HyperEVM vaults
→ Clawd: 💡 Добавлено в inbox (5 items)
```

**Просмотр inbox:**
```
User: /inbox
→ Clawd показывает список с ID
```

**Превратить в задачу:**
```
User: /promote inbox-123
→ Создаёт Google Task, удаляет из inbox
```

**Отложить в closet:**
```
User: /closet inbox-456
→ Убирает из inbox, сохраняет в closet
```

**Вернуть из closet:**
```
User: /uncloset closet-789
→ Возвращает в inbox
```

### Интеграция с Weekly Review

**Weekly review фокусируется только на active tasks:**
- Что сделано
- Что заблокировано
- Что в следующем спринте

**Inbox опционально:**
- "Хочешь что-то из inbox promote?"
- Но это НЕ обязательно

**Closet не трогаем:**
- Только по запросу пользователя

---

## Telegram Commands

### /inbox

**Просмотр inbox:**
```
User: /inbox
→ Clawd runs: bash {baseDir}/handlers/inbox_handler.sh list
```

**Добавить идею:**
```
User: /inbox Сделать гайд по HyperEVM vaults
→ Clawd runs: bash {baseDir}/handlers/inbox_handler.sh add "Сделать гайд по HyperEVM vaults"
```

**Reply context (автоматически):**
When user replies to a message with `/inbox`:
```
User: /inbox [reply to message]
→ Clawd extracts replied message text
→ Clawd runs: bash {baseDir}/handlers/inbox_handler.sh add-reply "<original text>" ""

User: /inbox review for content [reply to message]
→ Clawd runs: bash {baseDir}/handlers/inbox_handler.sh add-reply "<original text>" "review for content"
```

**Добавить задачу из X/Twitter ссылки:**
When user sends X/Twitter URL (x.com/i/status/...) with task-related context:
1. Fetch tweet content via agent-browser
2. Extract key info and actionable steps
3. Format as proper task title + detailed notes
4. Create task in Google Tasks without due date
5. Reply with task summary

### /closet

**Просмотр closet:**
```
User: /closet
→ Clawd runs: bash {baseDir}/handlers/closet_handler.sh list
```

**Переместить inbox → closet:**
```
User: /closet inbox-123
→ Clawd runs: bash {baseDir}/handlers/closet_handler.sh add "inbox-123"
```

### /uncloset

**Вернуть closet → inbox:**
```
User: /uncloset closet-456
→ Clawd runs: bash {baseDir}/handlers/closet_handler.sh uncloset "closet-456"
```

### /promote

**Превратить inbox → Google Task:**
```
User: /promote inbox-123
→ Clawd runs: bash {baseDir}/handlers/promote_handler.sh "inbox-123"

User: /promote inbox-123 2026-02-01
→ Clawd runs: bash {baseDir}/handlers/promote_handler.sh "inbox-123" "2026-02-01"
```

---

## Работа с Google Tasks

### Просмотр
```bash
# Списки задач
gog tasks lists --json

# Задачи из списка
gog tasks list <listId> --json
```

### Создание
```bash
# Простая задача
gog tasks add <listId> --title "Task name" --due "2026-01-24"

# С приоритетом
gog tasks add <listId> --title "[P1] Urgent task" --due "2026-01-24"

# С заметками
gog tasks add <listId> --title "Task" --notes "Details" --due "2026-01-24"
```

### Обновление
```bash
# Отметить выполненной
gog tasks done <listId> <taskId>

# Обновить
gog tasks update <listId> <taskId> --title "New title" --due "2026-01-25"
```

---

## Configuration

### Environment Variables

All paths are configurable via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `CLAWD_WORKSPACE` | `$HOME/clawd` | Clawdbot workspace root |
| `CLAWD_ENV_FILE` | `$CLAWD_WORKSPACE/.env` | Path to .env file |
| `SCRUM_DATA_DIR` | `$CLAWD_WORKSPACE/data/scrum` | Data storage directory |
| `GOG_ACCOUNT` | (from .env) | Google account email |
| `GOG_KEYRING_PASSWORD` | (from .env) | gog keyring password |
| `LIST_ID` | (auto-detected) | Override task list ID |
| `LIST_NAME` | (none) | Find list by name |

### Data Storage

```
$SCRUM_DATA_DIR/
├── blocked.json     # Заблокированные задачи
├── streaks.json     # Streaks и badges
└── exports/         # CSV экспорты
```

---

## Architecture

### lib.sh — Shared Library

Все скрипты используют общую библиотеку `scripts/lib.sh`:

- **Logging:** `log()`, `fail()`
- **Dependencies:** `require_cmd()`, `require_cmds()`
- **gog wrappers:** `run_gog()`, `run_gog_allow_fail()`
- **Tasks helpers:** `get_lists_json()`, `get_list_id()`, `fetch_tasks()`, `normalize_tasks()`, `normalize_lists()`
- **Data helpers:** `ensure_data_dir()`, `get_data_file()`, `get_exports_dir()`
- **Auto-loads** `.env` on source

### Tests

```bash
# Run local smoke tests (no API calls)
bash {baseDir}/tests/test_local.sh
```

Tests cover:
- blocked.sh add/list/remove
- streaks.sh complete/check
- timeblock.sh validation (time order, color range)
- Empty badges array handling

---

## Eisenhower Matrix

Приоритизация через теги в названии задачи:

| Tag | Meaning | Action |
|-----|---------|--------|
| `[P1]` | Urgent + Important | Делай сейчас |
| `[P2]` | Important | Планируй |
| `[P3]` | Nice to have | Когда будет время |

**Визуализация при review:**
```
📊 Eisenhower Matrix

🔴 URGENT + IMPORTANT
• [P1] Task A (due: today)

🟡 IMPORTANT  
• [P2] Task B (due: next week)

⚪ NO PRIORITY
• Task C (no due date)
```

---

## Coaching Prompts

### Задача просрочена
```
⚠️ Задача "X" просрочена на Y дней.
Что делаем?
1. Выполнить сегодня
2. Перенести дедлайн
3. Удалить (уже не актуально)
```

### Win celebration
```
🎉 Отлично! Закрыл "X"!
🔥 Streak: 5 дней | 💯 Всего: 42 задачи
```

---

## Requirements

- `gog` CLI v0.7.0+ с авторизацией (`gog auth login`)
- `jq` 1.7+
- `.env` file with `GOG_KEYRING_PASSWORD`

Check with: `bash {baseDir}/scripts/deps_check.sh`
