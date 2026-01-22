# План обновления Clawdbot

## Текущая ситуация

- **Установленная версия**: 2026.1.21-2 ✅
- **Последняя версия**: Проверить через `npm view clawdbot version`
- **Обновлено**: 2026-01-22

## Наши изменения

### Патч форматирования Telegram
- **Файл**: `~/.nvm/versions/node/v22.22.0/lib/node_modules/clawdbot/dist/telegram/format.js`
- **Что делает**: Автоматически добавляет символ `⠀` (U+2800) перед заголовками после пустых строк
- **Функции**: `markdownToTelegramHtml()` и `markdownToTelegramChunks()`

### Наш GitHub репозиторий
- **Clawd workspace**: `git@github.com:evgyur/clawdbot.git`
- **Telegram API**: `https://github.com/evgyur/telegram-mcp-api.git`

## План безопасного обновления

### Вариант 1: Автоматический (рекомендуется)

```bash
cd ~/clawd
./update-clawdbot-with-patch.sh
```

Скрипт:
1. Проверит текущую версию
2. Обновит Clawdbot до последней версии
3. Автоматически применит патч форматирования
4. Создаст резервные копии

### Вариант 2: Ручной

```bash
# 1. Обновить Clawdbot
npm install -g clawdbot@latest

# 2. Применить патч вручную
cd ~/clawd
./apply-telegram-format-patch.sh

# 3. Перезапустить сервис
systemctl --user restart clawdbot-gateway.service
```

## Важные изменения в новых версиях (2026.1.17-21)

### 2026.1.20 (последний большой релиз)
- **BREAKING**: Отклонение невалидных конфигов при старте
- Memory: гибридный BM25 + vector search
- Memory: SQLite embedding cache
- Memory: OpenAI batch indexing
- Plugins: улучшенная система плагинов
- Matrix: миграция на matrix-bot-sdk с E2EE
- Nostr: новый канал
- Gateway: новые эндпоинты `/v1/responses`
- Exec: улучшенная система безопасности
- Sessions: daily reset policy

### 2026.1.16-2 (наша текущая версия)
- Hooks система
- Media understanding
- Zalo Personal plugin
- Session identity links

## Что проверить после обновления

1. ✅ Патч форматирования применен
2. ✅ Конфигурация валидна (`clawdbot doctor`)
3. ✅ Сервис запущен (`systemctl --user status clawdbot-gateway.service`)
4. ✅ Telegram сообщения форматируются правильно
5. ✅ Все плагины работают

## Откат (если что-то пошло не так)

```bash
# Откатить версию
npm install -g clawdbot@2026.1.16-2

# Применить патч
cd ~/clawd
./apply-telegram-format-patch.sh

# Перезапустить
systemctl --user restart clawdbot-gateway.service
```

## Резервные копии

Скрипт автоматически создает резервные копии:
- `format.js.bak` - перед обновлением
- `format.js.bak2` - перед применением патча (если используется sed)
