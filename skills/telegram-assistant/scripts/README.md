# Telegram API Scripts для Clawdbot

Готовые Python скрипты для работы с Telegram через HTTP API.

## Требования

- Telegram API должен быть запущен на `http://localhost:8080`
- Python 3.10+
- Установлен `telegram_client.py` из `telegram-mcp-api`

## Скрипты

### get_unread_chats.py
Получить список чатов с непрочитанными сообщениями.

```bash
python get_unread_chats.py
```

**Вывод:** JSON с чатами, имеющими непрочитанные сообщения.

### get_digest.py
Получить полный дайджест непрочитанных сообщений.

```bash
python get_digest.py
```

**Вывод:** JSON с дайджестом всех непрочитанных сообщений по чатам.

### list_chats.py
Получить список всех чатов.

```bash
python list_chats.py [limit]
```

**Параметры:**
- `limit` (опционально) - максимальное количество чатов (по умолчанию 100)

### get_chat_messages.py
Получить сообщения из конкретного чата.

```bash
python get_chat_messages.py <chat_id> [limit]
```

**Параметры:**
- `chat_id` - ID чата или username (например, `@channel`)
- `limit` (опционально) - количество сообщений (по умолчанию 50)

### save_draft.py
Сохранить черновик сообщения.

```bash
python save_draft.py <chat_id> "<message>" [reply_to_message_id]
```

**Параметры:**
- `chat_id` - ID чата
- `message` - текст сообщения (в кавычках)
- `reply_to_message_id` (опционально) - ID сообщения для ответа

### extract_style.py
Извлечь стиль письма из канала для создания постов в том же стиле.

```bash
python extract_style.py <chat_id> [sample_size]
```

**Параметры:**
- `chat_id` - ID канала или username
- `sample_size` (опционально) - количество сообщений для анализа (по умолчанию 30)

**Анализирует:**
- Язык (RU/EN mix)
- Структуру (bullets, numbered lists)
- Тон (formal/casual)
- Длину сообщений
- Использование эмодзи
- Паттерны окончаний (P.S., CTA)

### summarize_chat.py
Создать саммари (сводку) чата или канала.

```bash
python summarize_chat.py <chat_id> [limit] [query]
```

**Параметры:**
- `chat_id` - ID чата или канала
- `limit` (опционально) - количество сообщений для анализа (по умолчанию 100)
- `query` (опционально) - поиск по ключевому слову

**Возвращает:**
- Ключевые темы
- Категории сообщений (вопросы, объявления, ссылки, решения)
- Примеры сообщений по категориям

### search_messages.py
Поиск сообщений в чате по ключевому слову.

```bash
python search_messages.py <chat_id> <query> [limit] [from_user]
```

**Параметры:**
- `chat_id` - ID чата
- `query` - поисковый запрос
- `limit` (опционально) - максимальное количество результатов (по умолчанию 20)
- `from_user` (опционально) - фильтр по отправителю

### analyze_period.py
Анализ сообщений за определенный период времени.

```bash
python analyze_period.py <chat_id> <days> [query]
```

**Примеры:**
- `python analyze_period.py 2442970324 7` - анализ за последние 7 дней
- `python analyze_period.py 2442970324 30 "крипто"` - анализ за 30 дней с фильтром

**Возвращает:** Активность по часам/авторам, ключевые темы, статистику

### export_chat.py
Экспорт сообщений в файл (JSON, CSV, TXT).

```bash
python export_chat.py <chat_id> [limit] [format] [output_file]
```

**Форматы:** `json`, `csv`, `txt`

**Примеры:**
- `python export_chat.py 2442970324 100 json`
- `python export_chat.py 2442970324 50 csv messages.csv`

### monitor_keywords.py
Мониторинг нескольких ключевых слов в чате.

```bash
python monitor_keywords.py <chat_id> <keyword1> [keyword2] ... [limit]
```

**Пример:** `python monitor_keywords.py 2442970324 "крипто" "биткоин" "эфир" 50`

### group_similar.py
Группировка похожих/дублирующихся сообщений.

```bash
python group_similar.py <chat_id> [limit] [similarity_threshold]
```

**Пример:** `python group_similar.py 2442970324 200 0.8` (порог схожести 80%)

### activity_stats.py
Детальная статистика активности в чате.

```bash
python activity_stats.py <chat_id> [limit] [days]
```

**Возвращает:** Самые активные авторы, активность по часам/дням недели, пиковые периоды

### compare_chats.py
Сравнение активности между несколькими чатами.

```bash
python compare_chats.py <chat_id1> <chat_id2> [chat_id3] ... [days]
```

**Пример:** `python compare_chats.py 2442970324 1126647644 7`

### find_mentions.py
Поиск всех упоминаний пользователя во всех чатах.

```bash
python find_mentions.py [username] [limit_chats] [limit_messages]
```

**Пример:** `python find_mentions.py @ChipCR 20 50`

## Использование в Clawdbot

Все скрипты возвращают JSON, который Clawdbot может парсить и использовать.

**Пример использования:**
```bash
# В Clawdbot через exec
python /home/eyurc/clawd/skills/telegram-assistant/scripts/get_unread_chats.py
```

## Формат вывода

Все скрипты выводят JSON в stdout. При ошибках возвращают JSON с полем `error`.

**Успешный ответ:**
```json
{
  "unread_count": 5,
  "chats": [...]
}
```

**Ошибка:**
```json
{
  "error": "Описание ошибки"
}
```

## Проверка работы

```bash
# Проверить, что API работает
curl http://localhost:8080/health

# Проверить скрипт
python get_unread_chats.py
```
