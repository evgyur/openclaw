# telegram-assistant (skill)

A draft-first Telegram processing skill powered by `telegram-mcp`.

## What it does

- Digest unread messages across chats
- Triage and prioritize DMs/groups/channels
- Summarize a chat/channel over a time window
- Extract channel writing style
- Draft replies/posts and save them as Telegram drafts
- Run automated scripts via HTTP API

## Modes of Operation

| Mode | Use Case | Interface |
|------|----------|-----------|
| **MCP** | Claude Desktop / Cursor | `mcp__telegram-mcp__*` tools |
| **HTTP API** | Local scripts / automation | REST API on port 8080 |

## Quick Start

### For Claude Desktop / Cursor (MCP Mode)

1. Set up telegram-mcp (see `references/setup.md`)
2. Symlink into your skills directory:
   ```bash
   ln -s /path/to/telegram-assistant ~/.claude/skills/telegram-assistant
   ```
3. Restart your agent

### For Local Scripts (HTTP API Mode)

1. Start the API:
   ```bash
   cd /path/to/telegram-mcp-api
   docker compose up telegram-api -d
   ```

2. Use the Python client:
   ```python
   from telegram_client import TelegramClient

   client = TelegramClient()
   print(client.get_chats())
   client.send_message(chat_id=123, message="Hello!")
   client.close()
   ```

## Requirements

- `telegram-mcp-api` configured with valid Telegram credentials
- Docker & Docker Compose (for HTTP API mode)
- See `references/setup.md` for detailed instructions

## Repository

https://github.com/DimaPhil/telegram-mcp-api

## Safety

This skill follows a **draft-first policy**:

- Never sends messages directly (use `save_draft` instead)
- Always saves to drafts for manual review in Telegram
- Confirms target chat before any action

## Workflows

1. **Digest** - Summarize unread messages across all chats
2. **Triage** - Prioritize chats into urgent/needs-reply/read-only
3. **Summarize** - Summarize a specific chat over a time window
4. **Style Extract** - Extract writing style from a channel
5. **Draft** - Create replies/posts matching your style
6. **Scripts** - Run automated operations via HTTP API

See `SKILL.md` for detailed workflow instructions.

## Files

```
telegram-assistant/
├── SKILL.md                          # Main skill definition
├── README.md                         # This file
└── references/
    ├── setup.md                      # Installation guide
    ├── style-guide-template.md       # Template for style extraction
    └── style-guide.md                # (generated) Your channel's style
```
