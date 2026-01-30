---
name: tgdl
description: Download all messages from any Telegram channel or chat using Telethon. Use when user asks to download, scrape, or export messages from a Telegram channel or chat. Returns JSON file with all messages including text, dates, views, forwards, and reply metadata.
---

# tgdl - Telegram Channel/Chat Downloader

Download all messages from any public Telegram channel or chat using Telethon.

## Trigger

Use when user asks to:
- Download messages from a Telegram channel or chat
- Scrape Telegram channel/chat content
- Export Telegram channel/chat data
- Get all messages from t.me/channel_name or chat

## Quick Start

```bash
source $TELEGRAM_MCP_PATH/venv/bin/activate
python3 $CLAWD_WORKSPACE/skills/tgdl/scripts/download_channel.py <channel_username> [output_file]
```

**Examples:**
```bash
# Download channel to default location
python3 scripts/download_channel.py y22_trades

# Download chat to default location
python3 scripts/download_channel.py hyperliquid_ru

# Download to specific file
python3 scripts/download_channel.py cryptonews $HOME/data/crypto.json
```

## Output Format

JSON file with array of messages:

```json
[
  {
    "id": 123,
    "date": "2026-01-25T01:00:00+00:00",
    "text": "Message content...",
    "views": 1500,
    "forwards": 10,
    "reply_to": 120
  }
]
```

## How It Works

1. Uses existing Telethon session from `$TELEGRAM_MCP_PATH/venv/`
2. Connects with stored credentials (API_ID, API_HASH, SESSION_STRING)
3. Downloads ALL messages from channel (no limit)
4. Saves to JSON in chronological order (oldest first)
5. Shows progress every 100 messages

## Credentials

Uses same credentials as biohacking skill:
- Path: `$CLAWD_WORKSPACE/data/biohacking-chat/download_media.py`
- API_ID: 27317240
- API_HASH: 83217ba67036c2b2bb3c20f1b691f593
- SESSION_STRING: (embedded in script)

## Technical Details

- **Library:** Telethon (Python)
- **venv:** `$TELEGRAM_MCP_PATH/venv/`
- **Default output:** `$CLAWD_WORKSPACE/skills/tgdl/data/{channel}_messages.json`
- **Order:** Chronological (oldest → newest)

## Common Issues

**Q: Channel/chat not found**
A: Check username (without @). Public channels/chats only. For private chats, you must be a member.

**Q: No output**
A: Check venv activation. Ensure Telethon installed.

**Q: Session expired**
A: Update SESSION_STRING from biohacking scripts.

## References

See [references/telethon-setup.md](references/telethon-setup.md) for session setup and credential management.
