# Миграция на форк evgyur/openclaw

Инструкция для миграции существующего Clawdbot workspace на форк `evgyur/openclaw`.

> **Важно:** Эта инструкция для Cursor или другого AI-агента. Выполнять пошагово.

---

## Преамбула

**Форк `evgyur/openclaw`** — это форк основного репозитория `openclaw/openclaw` с добавленными:
- 59 дополнительных skills (crypto, telegram, marketing, tools)
- Telegram format patch scripts
- Counter-check hook (Scholar self-improvement)
- Backup scripts

**Для пользователя Chip (eyurc):**
- **Skills остаются локальные, НЕ заменяются из форка** — папка `~/clawd/skills/` не трогается
- Меняется только git remote
- Все данные и конфиги сохраняются
- НЕ делать `git checkout origin/main` или `git reset --hard` — это затрёт локальные skills

---

## Шаг 0: Проверка перед началом

```bash
# Проверить что clawdbot работает
systemctl --user status clawdbot-gateway.service

# Проверить текущий remote
cd ~/clawd
git remote -v
```

**Ожидаемый результат:** Сервис active, remote показывает `evgyur/clawdbot` или подобное.

---

## Шаг 1: Полный бэкап (ОБЯЗАТЕЛЬНО)

```bash
# Создать директорию для бэкапов
mkdir -p ~/clawdbot-migration-backup

# Бэкап конфигурации (~/.clawdbot)
tar -czf ~/clawdbot-migration-backup/clawdbot-config-$(date +%Y%m%d-%H%M%S).tar.gz ~/.clawdbot

# Бэкап workspace (~/clawd)
tar -czf ~/clawdbot-migration-backup/clawd-workspace-$(date +%Y%m%d-%H%M%S).tar.gz ~/clawd

# Бэкап telegram-mcp-api
tar -czf ~/clawdbot-migration-backup/telegram-mcp-api-$(date +%Y%m%d-%H%M%S).tar.gz ~/telegram-mcp-api

# Бэкап systemd services
mkdir -p ~/clawdbot-migration-backup/systemd
cp ~/.config/systemd/user/clawdbot*.service ~/clawdbot-migration-backup/systemd/ 2>/dev/null || true
cp ~/.config/systemd/user/telegram*.service ~/clawdbot-migration-backup/systemd/ 2>/dev/null || true

# Проверить бэкапы
ls -la ~/clawdbot-migration-backup/
```

**Ожидаемый результат:** 3-4 tar.gz файла + папка systemd с сервисами.

---

## Шаг 2: Сохранить персональные файлы workspace

```bash
cd ~/clawd

# Сохранить персональные markdown файлы
cp SOUL.md SOUL.md.personal 2>/dev/null || true
cp USER.md USER.md.personal 2>/dev/null || true
cp HEARTBEAT.md HEARTBEAT.md.personal 2>/dev/null || true
cp TOOLS.md TOOLS.md.personal 2>/dev/null || true
cp AGENTS.md AGENTS.md.personal 2>/dev/null || true
cp IDENTITY.md IDENTITY.md.personal 2>/dev/null || true

# Проверить
ls -la *.personal
```

**Ожидаемый результат:** 4-6 файлов с расширением `.personal`.

---

## Шаг 3: Сохранить текущее состояние git

```bash
cd ~/clawd

# Сохранить все незакоммиченные изменения
git stash push -m "pre-migration-$(date +%Y%m%d-%H%M%S)"

# Проверить stash
git stash list
```

**Ожидаемый результат:** Stash создан (или "No local changes to save" если всё чисто).

---

## Шаг 4: Добавить форк как новый remote

```bash
cd ~/clawd

# Переименовать текущий origin
git remote rename origin old-origin 2>/dev/null || true

# Добавить форк как origin
git remote add origin https://github.com/evgyur/openclaw.git

# Добавить upstream (оригинальный openclaw)
git remote add upstream https://github.com/openclaw/openclaw.git 2>/dev/null || true

# Проверить remotes
git remote -v
```

**Ожидаемый результат:**
```
old-origin  ... (fetch)
old-origin  ... (push)
origin      https://github.com/evgyur/openclaw.git (fetch)
origin      https://github.com/evgyur/openclaw.git (push)
upstream    https://github.com/openclaw/openclaw.git (fetch)
upstream    https://github.com/openclaw/openclaw.git (push)
```

---

## Шаг 5: Fetch форка (БЕЗ merge)

```bash
cd ~/clawd

# Скачать данные форка
git fetch origin

# Посмотреть ветки
git branch -a
```

**Ожидаемый результат:** Появятся `remotes/origin/main` и другие ветки.

---

## Шаг 6: Создать ветку для своих изменений

```bash
cd ~/clawd

# Создать ветку с текущим состоянием (сохраняет все локальные skills!)
git checkout -b personal-setup

# Проверить
git branch
```

**Ожидаемый результат:** Текущая ветка `personal-setup`, main остаётся как была.

> **ВАЖНО:** НЕ делать `git merge origin/main` или `git reset` — это может затереть локальные skills.
> Ветка `personal-setup` сохраняет твои локальные файлы как есть.

---

## Шаг 7: Восстановить персональные файлы

```bash
cd ~/clawd

# Восстановить персональные файлы
cp SOUL.md.personal SOUL.md 2>/dev/null || true
cp USER.md.personal USER.md 2>/dev/null || true
cp HEARTBEAT.md.personal HEARTBEAT.md 2>/dev/null || true
cp TOOLS.md.personal TOOLS.md 2>/dev/null || true
cp AGENTS.md.personal AGENTS.md 2>/dev/null || true
cp IDENTITY.md.personal IDENTITY.md 2>/dev/null || true

# Удалить временные файлы
rm -f *.personal

# Проверить
cat SOUL.md | head -5
```

**Ожидаемый результат:** Персональные файлы восстановлены.

---

## Шаг 8: Восстановить stash (если был)

```bash
cd ~/clawd

# Посмотреть stash
git stash list

# Если есть stash, восстановить
git stash pop 2>/dev/null || echo "No stash to pop"
```

---

## Шаг 9: Применить telegram format patch (если нужно)

```bash
# Проверить, применён ли патч
CLAWDBOT_FORMAT=$(find ~/.nvm -name "format.js" -path "*/clawdbot/dist/telegram/format.js" 2>/dev/null | head -1)

if [ -n "$CLAWDBOT_FORMAT" ]; then
    if grep -q "Fix: Telegram removes empty lines" "$CLAWDBOT_FORMAT"; then
        echo "✅ Патч уже применён"
    else
        echo "⚠️ Патч не применён, применяю..."
        ~/clawd/apply-telegram-format-patch-simple.sh || \
        ~/clawd/scripts/patches/apply-telegram-format-patch-simple.sh 2>/dev/null || \
        echo "❌ Скрипт патча не найден"
    fi
else
    echo "⚠️ Clawdbot format.js не найден"
fi
```

---

## Шаг 10: Проверка после миграции

```bash
# 1. Проверить сервис
systemctl --user status clawdbot-gateway.service

# 2. Проверить конфиг
cat ~/.clawdbot/clawdbot.json | head -20

# 3. Проверить skills
ls ~/clawd/skills/ | wc -l

# 4. Проверить память
ls ~/clawd/memory/ | head -5

# 5. Проверить cron jobs
cat ~/.clawdbot/cron/jobs.json | head -20

# 6. Проверить telegram-mcp-api
systemctl --user status telegram-api.service
```

**Ожидаемый результат:** Все сервисы работают, skills на месте, память сохранена.

---

## Откат (если что-то пошло не так)

### Вариант A: Быстрый откат remote

```bash
cd ~/clawd
git remote remove origin
git remote rename old-origin origin
```

### Вариант B: Полный откат из бэкапа

```bash
# Остановить сервисы
systemctl --user stop clawdbot-gateway.service

# Восстановить workspace
rm -rf ~/clawd
tar -xzf ~/clawdbot-migration-backup/clawd-workspace-*.tar.gz -C ~/

# Восстановить конфиг
rm -rf ~/.clawdbot
tar -xzf ~/clawdbot-migration-backup/clawdbot-config-*.tar.gz -C ~/

# Запустить сервисы
systemctl --user start clawdbot-gateway.service
```

---

## Обновление форка в будущем

### Получить обновления из upstream (openclaw/openclaw)

```bash
cd ~/clawd
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

### Получить обновления из своего форка

```bash
cd ~/clawd
git fetch origin
git checkout personal-setup
git merge origin/main
```

---

## Что НЕ затрагивается миграцией

| Компонент | Путь | Статус |
|-----------|------|--------|
| **Local skills** | `~/clawd/skills/` | ✅ **Остаются локальные, НЕ из форка** |
| Clawdbot config | `~/.clawdbot/` | ✅ Не трогается |
| Cron jobs | `~/.clawdbot/cron/jobs.json` | ✅ Не трогается |
| Telegram credentials | `~/.clawdbot/credentials/` | ✅ Не трогается |
| Telegram session | `~/.clawdbot/telegram/` | ✅ Не трогается |
| Memory files | `~/clawd/memory/` | ✅ В .gitignore |
| Learnings | `~/clawd/.learnings/` | ✅ В .gitignore |
| Environment | `~/clawd/.env` | ✅ В .gitignore |
| Python venv | `~/clawd/venv/` | ✅ В .gitignore |
| Data dirs | `~/clawd/data/`, `media/`, etc. | ✅ В .gitignore |
| Telegram MCP API | `~/telegram-mcp-api/` | ✅ Отдельный репо |
| Systemd services | `~/.config/systemd/user/` | ✅ Не трогается |
| Node modules patch | `~/.nvm/.../clawdbot/` | ✅ Не трогается |

---

## Контакты

- Форк: https://github.com/evgyur/openclaw
- Upstream: https://github.com/openclaw/openclaw
- Автор форка: Evgeny "Chip" Yurchenko (@evgyur)
