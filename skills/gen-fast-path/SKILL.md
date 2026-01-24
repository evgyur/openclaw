---
name: gen-fast-path
description: Fast path optimization for /gen command. Patches Clawdbot to respond instantly (<500ms) by caching UI buttons and bypassing Claude for navigation.
metadata: {"clawdbot":{"emoji":"⚡","always":true}}
---

# Gen Fast Path ⚡

Оптимизация `/gen` команды для мгновенного отклика через патч Clawdbot core.

## Что это даёт

**До оптимизации:**
- `/gen` → 5-8 секунд (Claude inference + router.py)
- Выбор категории → 5-8 секунд
- Выбор модели → 5-8 секунд

**После оптимизации:**
- `/gen` → <500ms (прямой ответ из кеша)
- Выбор категории → <500ms
- Выбор модели → <500ms

**Улучшение:** 10-16x быстрее для UI навигации

---

## Архитектура

### До патча
```
Telegram → Clawdbot → Claude (5-8s) → router.py (500ms) → Claude (5-8s) → Telegram
```

### После патча
```
Telegram → Clawdbot → Fast Path → Кеш → Telegram (<500ms)
                    ↓
                 Claude (только для генерации изображений)
```

---

## Установка

### Шаг 1: Применить патч

```bash
cd /home/eyurc/clawd/skills/gen-fast-path
bash scripts/apply-patch.sh
```

Скрипт автоматически:
1. Создаст бэкап `bot-handlers.js`
2. Применит патч к Clawdbot
3. Создаст кеш в `~/.clawdbot/extensions/gen-fast-path/`
4. Перезапустит Clawdbot

### Шаг 2: Проверка

Отправь `/gen` через систему:
- Должны прийти кнопки **мгновенно**
- Навигация по категориям/моделям — мгновенная
- Генерация изображений работает как раньше

---

## Обновление

### При добавлении новых моделей в chip-fai

```bash
cd /home/eyurc/clawd/skills/gen-fast-path
bash scripts/update-cache.sh
systemctl --user restart clawdbot-gateway
```

### При обновлении Clawdbot

После `npm install -g clawdbot@latest` патч будет перезаписан:

```bash
cd /home/eyurc/clawd/skills/gen-fast-path
bash scripts/apply-patch.sh
```

---

## Откат

```bash
cd /home/eyurc/clawd/skills/gen-fast-path
bash scripts/rollback.sh
```

Восстановит оригинальный `bot-handlers.js` из бэкапа.

---

## Файлы

```
gen-fast-path/
├── SKILL.md                    # Документация
├── scripts/
│   ├── apply-patch.sh          # Применить патч
│   ├── update-cache.sh         # Обновить кеш моделей
│   ├── rollback.sh             # Откатить патч
│   └── verify.sh               # Проверить установку
├── patches/
│   └── bot-handlers.patch      # Патч для Clawdbot
└── cache/
    └── gen-cache.json          # Кеш кнопок
```

---

## Maintenance

### Проверка статуса

```bash
bash scripts/verify.sh
```

Покажет:
- ✅ Патч применён / ❌ Не применён
- ✅ Кеш загружен / ❌ Кеш не найден
- Количество команд в кеше
- Версия Clawdbot

### Логи

```bash
journalctl --user -u clawdbot-gateway --since '1 hour ago' | grep -i "gen\|cache"
```

---

## Технические детали

### Что патчится

**Файл:** `~/.nvm/versions/node/v22.22.0/lib/node_modules/clawdbot/dist/telegram/bot-handlers.js`

**Изменения:**
1. Добавляется `import { readFileSync } from "fs"`
2. Добавляются функции `isGenCommand()` и `sendGenResponse()`
3. В `bot.on("callback_query")` добавляется проверка fast path

**Объём:** ~60 строк кода

### Что кешируется

- `/gen` — стартовая команда
- `category:create`, `category:edit`, `category:enhance` — выбор категории
- `model:*` — все 18 моделей (nanobana-create, flux-pro, recraft, и т.д.)
- `back:category` — навигация назад

**Формат кеша:**
```json
{
  "command": {
    "message": "Text to send",
    "buttons": [[{"text": "Button", "callback_data": "callback"}]]
  }
}
```

### Безопасность

- ✅ Кеш только для UI — никакой генерации
- ✅ Fallback в Claude если кеш недоступен
- ✅ Валидация команд через `isGenCommand()`
- ✅ Не влияет на другие команды Clawdbot

---

## Troubleshooting

### Кнопки всё равно медленные

1. Проверь что патч применён:
   ```bash
   grep "GEN FAST PATH" ~/.nvm/versions/node/v22.22.0/lib/node_modules/clawdbot/dist/telegram/bot-handlers.js
   ```

2. Проверь что кеш загружается:
   ```bash
   ls -la ~/.clawdbot/extensions/gen-fast-path/gen-cache.json
   ```

3. Проверь логи:
   ```bash
   journalctl --user -u clawdbot-gateway --since '5 minutes ago'
   ```

### Clawdbot не стартует после патча

```bash
# Откат
bash scripts/rollback.sh

# Проверь синтаксис
node -c ~/.nvm/versions/node/v22.22.0/lib/node_modules/clawdbot/dist/telegram/bot-handlers.js
```

### Новые модели не появляются

```bash
# Обновить кеш
bash scripts/update-cache.sh

# Перезапустить
systemctl --user restart clawdbot-gateway
```

---

## Changelog

### v1.0.0 (2026-01-24)
- Первая версия
- Кеширование 23 команд
- Улучшение производительности 10-16x
- Автоматическая установка через скрипт

---

## Credits

- Разработка: Chip (@ChipCR)
- Интеграция: Claude (Anthropic)
- Архитектура: Bot Proxy → Direct Patch
