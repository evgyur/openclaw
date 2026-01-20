---
name: telegram-assistant
description: |
  Telegram automation assistant powered by telegram-mcp.

  Use when users want to process and aggregate Telegram data, including:
  (1) Digest unread messages across chats
  (2) Triage messages (mentions/questions/urgent)
  (3) Summarize a chat/channel over a time window
  (4) Draft replies and posts (draft-first)
  (5) Extract writing style from a channel to match tone
  (6) Run local automation scripts via HTTP API

  Triggers: "telegram digest", "unread messages", "telegram triage",
  "summarize this chat", "summarize this channel", "draft reply",
  "draft post", "extract style", "analyze writing style",
  "telegram analytics", "telegram workflow", "telegram script"
license: MIT
metadata:
  author: Dima + Jarvis
  version: "0.2.0"
  category: productivity
  telegram-mcp-api-repo: https://github.com/DimaPhil/telegram-mcp-api
  upstream-repo: https://github.com/chigwell/telegram-mcp
allowed-tools: mcp__telegram-mcp__* Read Write Edit Glob Bash
---

# Telegram Assistant

Process and aggregate your Telegram data: digests, triage, summaries, and draft-first replies.

## Modes of Operation

### MCP Mode (Claude Desktop / Cursor)
Use `mcp__telegram-mcp__*` tools directly. This is the default for interactive use.

### HTTP API Mode (Local Scripts)
For automation scripts, use the HTTP API running in Docker:
```bash
docker compose up telegram-api
```

Then use the Python client:
```python
from telegram_client import TelegramClient
client = TelegramClient()  # http://localhost:8080
```

---

## Safety (Draft-First)

- Never send messages directly via `send_message`.
- Use `save_draft` so you can review and send in Telegram.
- Always confirm the target chat/channel before saving a draft.

---

## Workflow 1: Digest (Unread Overview)

**Goal**: Summarize what you missed across Telegram.

### Step 1: Find Unread Chats

**MCP Mode:**
```
Use mcp__telegram-mcp__list_chats with unread_only=true
```

**HTTP API Mode:**
```python
chats = client.list_chats(unread_only=True)
```

### Step 2: Pull Recent Messages
For each unread chat:

**MCP Mode:**
```
Use mcp__telegram-mcp__get_messages(chat_id=..., page_size=50)
```

**HTTP API Mode:**
```python
messages = client.get_messages(chat_id, page_size=50)
```

### Step 3: Produce the Digest
Output sections:
- **Action needed**: direct questions, decisions, requests.
- **Mentions / pings**: anything addressed to the user.
- **FYI**: announcements, links, updates.
- **Low priority**: chatter.

### Optional: Draft Replies
For each "action needed" item:

**Clawdbot (HTTP API Mode):**
```bash
python /home/eyurc/clawd/skills/telegram-assistant/scripts/save_draft.py <chat_id> "<message>" [reply_to_message_id]
```

**MCP Mode (Claude Desktop / Cursor):**
```
Use mcp__telegram-mcp__save_draft(chat_id=..., message=..., reply_to=...)
```

---

## Workflow 2: Triage (Inbox Zero)

**Goal**: Turn many chats into a small prioritized action list.

### Step 1: Collect Candidates

**MCP Mode:**
```
Use mcp__telegram-mcp__list_chats(limit=50)
```

**HTTP API Mode:**
```python
chats = client.list_chats(limit=50)
```

### Step 2: Classify
Classify each chat into:
- **Urgent**: time-sensitive, direct questions, work-critical.
- **Needs reply**: questions, follow-ups.
- **Read-only**: channels/announcements.
- **Ignore**: noise.

### Step 3: Output an Action Plan
For each urgent/needs reply:
- Quote the key message(s) with author + timestamp.
- Provide a 1–2 sentence recommended response.

### Step 4: Draft
Save drafts for the top items using `save_draft`.

---

## Workflow 3: Summarize a Chat/Channel

**Goal**: Summarize a specific chat/channel over a time window.

### Inputs to Ask For
- Chat identifier (exact title from `list_chats`, username, or numeric ID).
- Time window: last N hours/days, or a start/end time.
- Output format: bullet digest vs narrative.

### Steps

**Clawdbot (HTTP API Mode):**
Выполни скрипт для создания саммари:
```bash
python /home/eyurc/clawd/skills/telegram-assistant/scripts/summarize_chat.py <chat_id> [limit] [query]
```

Скрипт автоматически:
- Получает сообщения из чата/канала
- Категоризирует их (вопросы, объявления, ссылки, решения, обсуждения)
- Извлекает ключевые темы
- Формирует структурированное саммари

Для поиска по ключевому слову:
```bash
python /home/eyurc/clawd/skills/telegram-assistant/scripts/search_messages.py <chat_id> <query> [limit]
```

**MCP Mode (Claude Desktop / Cursor):**
```
1. Use mcp__telegram-mcp__get_messages(chat_id=..., page_size=100)
2. Use mcp__telegram-mcp__search_messages for keyword filtering
```

### Output Structure
- **Key themes**
- **Decisions**
- **Open questions**
- **Links/resources**

---

## Workflow 4: Style Extraction (Channel Voice)

**Goal**: Extract writing style from a channel so drafts match your tone.

### Step 1: Fetch Representative Posts

**Clawdbot (HTTP API Mode):**
Выполни скрипт для анализа стиля:
```bash
python /home/eyurc/clawd/skills/telegram-assistant/scripts/extract_style.py <chat_id> [sample_size]
```

Скрипт автоматически:
- Получает сообщения из канала
- Анализирует язык (RU/EN mix)
- Определяет структуру (bullets, numbered lists, questions)
- Анализирует тон (formal/casual)
- Измеряет длину сообщений
- Подсчитывает использование эмодзи
- Анализирует окончания (P.S., CTA)

**MCP Mode (Claude Desktop / Cursor):**
```
Use mcp__telegram-mcp__get_messages(chat_id=..., page_size=30)
```

### Step 2: Analyze Style
Скрипт `extract_style.py` автоматически анализирует:
- Language mix (RU/EN)
- Structure (hooks, TL;DR, bullets)
- Tone (formal/casual)
- Length
- Emoji usage
- Endings/CTAs

### Step 3: Generate Style Guide
Результат анализа возвращается в JSON формате. Используй его для создания постов в том же стиле.

---

## Workflow 5: Draft Replies / Posts (Using Style Guide)

**Goal**: Draft content and save it to Telegram as a draft.

### Step 1: Determine Target
- Confirm chat/channel.
- If drafting a post, confirm this is a channel where you have posting rights.

### Step 2: Load Style (If Needed)
- If `references/style-guide.md` exists, read it.
- Otherwise run Workflow 4.

### Step 3: Draft
- Produce 1–3 variants if the user wants options.
- Keep it consistent with the extracted style.

### Step 4: Save Draft

**MCP Mode:**
```
Use mcp__telegram-mcp__save_draft(chat_id=..., message=...)
For replies: include reply_to=msg_id
```

**HTTP API Mode:**
```python
client.save_draft(chat_id, message, reply_to=msg_id)
```

---

## Workflow 6: Automated Scripts (HTTP API)

**Goal**: Run scheduled or automated Telegram operations via local scripts.

### Setup
```bash
# Start the HTTP API in Docker
cd /path/to/telegram-mcp
docker compose up telegram-api -d
```

### Example: Daily Digest Script
```python
#!/usr/bin/env python3
from telegram_client import TelegramClient

client = TelegramClient()

# Get unread chats
chats = client.list_chats(unread_only=True)

for chat in chats:
    messages = client.get_messages(chat['id'], page_size=20)
    # Process messages...
    print(f"Chat: {chat['name']} - {len(messages)} unread")

client.close()
```

### Example: Channel Monitor
```python
#!/usr/bin/env python3
from telegram_client import TelegramClient

client = TelegramClient()

# Monitor a specific channel
results = client.search_messages(
    chat_id="@channel_name",
    query="important keyword",
    limit=10
)

for msg in results:
    print(f"[{msg['date']}] {msg['text'][:100]}")

client.close()
```

See `telegram-mcp/examples/` for more script examples.

---

## API Reference

### MCP Tools
All tools are prefixed with `mcp__telegram-mcp__`:
- `get_chats`, `list_chats`, `get_chat`
- `get_messages`, `send_message`, `edit_message`, `delete_message`
- `search_messages`, `forward_message`
- `list_contacts`, `search_contacts`, `add_contact`, `delete_contact`
- `get_me`, `get_user_status`, `resolve_username`
- `create_group`, `invite_to_group`, `leave_chat`, `get_participants`
- `get_admins`, `promote_admin`, `ban_user`, `unban_user`
- `get_invite_link`
- `mute_chat`, `unmute_chat`
- `archive_chat`, `unarchive_chat`
- `save_draft`, `clear_draft`, `get_drafts`

### HTTP API Endpoints
Base URL: `http://localhost:8080`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/chats` | GET | List chats (paginated) |
| `/chats/list` | GET | List chats with filters |
| `/chats/{id}` | GET | Get chat details |
| `/chats/{id}/messages` | GET | Get messages |
| `/messages/send` | POST | Send message |
| `/messages/search` | POST | Search messages |
| `/contacts` | GET | List contacts |
| `/me` | GET | Current user info |
| `/drafts/save` | POST | Save draft |
| `/drafts/{id}` | DELETE | Clear draft |

---

## Troubleshooting

### MCP Mode
- "Could not find the input entity": try exact chat title from `list_chats`, or numeric ID.
- Draft not appearing: open the target chat in Telegram; drafts are saved per-chat.
- Rate limits: space out calls, avoid scanning too many chats at once.

### HTTP API Mode
- Connection refused: ensure `docker compose up telegram-api` is running.
- 500 errors: check container logs with `docker compose logs telegram-api`.
- Session issues: regenerate session string with `session_string_generator.py`.

---

## Resources

- Setup: `references/setup.md`
- Style template: `references/style-guide-template.md`
- telegram-mcp-api: https://github.com/DimaPhil/telegram-mcp-api
- Upstream telegram-mcp: https://github.com/chigwell/telegram-mcp
- Example scripts: `telegram-mcp-api/examples/`
