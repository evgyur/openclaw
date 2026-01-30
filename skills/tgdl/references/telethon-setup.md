# Telethon Setup & Credentials

## Overview

The tgdl skill uses Telethon with an existing session from telegram-mcp-api.

## Credentials Location

Credentials are embedded in the download script, sourced from:
```
$CLAWD_WORKSPACE/data/biohacking-chat/download_media.py
```

### Current Credentials

```python
API_ID = 27317240
API_HASH = "83217ba67036c2b2bb3c20f1b691f593"
SESSION_STRING = "1ApWapzMBu0mkSiiL26y7V1Ks3EksMVffNdxhdJvMJKW2V-1Z5ircFHp4JXk-A1NZoNSFt8HpCyIdEVeB-etUxt78QekcUXlAETUtYcj7SRu_UFDQiFhlNgDMgK4yZj-613GjvvyHbi3_c7KOHYQvI99KgQ9EpzzA5saL6YRacxnSWmooi-qROKVDBShmx17gcp--0mHxC9flqyioblRsBrv-56lhgiEpOHxxvTOYMsyfslV7AQMNPnRFXRKfgNw9q4Rw0Da54rgO7dzd2LAUb5CJFL0s3zoSRkvSvYI-Kxj2Cb7qN6A2U6DkVEu7jSfyChu8RhqQu6APZJB7kadVVC3rNnsunxM="
```

## Virtual Environment

**Path:** `$TELEGRAM_MCP_PATH/venv/`

**Activation:**
```bash
source $TELEGRAM_MCP_PATH/venv/bin/activate
```

**Installed packages:**
- telethon (1.42.0)
- pyaes
- rsa
- pyasn1

## Getting New Credentials (if needed)

### 1. Get API_ID and API_HASH

1. Visit https://my.telegram.org/auth
2. Log in with phone number
3. Go to "API development tools"
4. Create new application
5. Copy `api_id` and `api_hash`

### 2. Generate SESSION_STRING

Run this script to create a session string:

```python
from telethon import TelegramClient
from telethon.sessions import StringSession

API_ID = YOUR_API_ID
API_HASH = "YOUR_API_HASH"

with TelegramClient(StringSession(), API_ID, API_HASH) as client:
    print("Session string:", client.session.save())
```

You'll be prompted to:
1. Enter phone number
2. Enter code from Telegram
3. Enter 2FA password (if enabled)

Copy the output SESSION_STRING and update the script.

## Security Note

The SESSION_STRING grants full access to the Telegram account. Keep it private.

If compromised:
1. Revoke active sessions in Telegram → Settings → Privacy and Security → Active Sessions
2. Generate new SESSION_STRING

## Usage in Other Scripts

To reuse credentials in custom scripts:

```python
from telethon import TelegramClient
from telethon.sessions import StringSession

API_ID = 27317240
API_HASH = "83217ba67036c2b2bb3c20f1b691f593"
SESSION_STRING = "..." # From above

client = TelegramClient(StringSession(SESSION_STRING), API_ID, API_HASH)

async def main():
    await client.start()
    # Your code here
    await client.disconnect()

import asyncio
asyncio.run(main())
```

## Troubleshooting

### "Session expired" error

Regenerate SESSION_STRING (see above).

### "Module not found: telethon"

Activate venv first:
```bash
source $TELEGRAM_MCP_PATH/venv/bin/activate
```

### "Connection timeout"

Check internet connection. Try again in a few minutes.

### "Flood wait" error

Telegram rate-limited you. Wait the specified time (usually 30-60 seconds).
