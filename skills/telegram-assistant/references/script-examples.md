# Script Examples for telegram-assistant

Ready-to-use Python scripts for Telegram automation via the HTTP API.

## Prerequisites

1. Start the HTTP API:
   ```bash
   cd /path/to/telegram-mcp-api
   docker compose up telegram-api -d
   ```

2. Verify it's running:
   ```bash
   curl http://localhost:8080/health
   ```

3. Copy `telegram_client.py` from telegram-mcp to your scripts directory, or add to path:
   ```python
   import sys
   sys.path.insert(0, '/path/to/telegram-mcp-api')
   ```

---

## Example 1: Daily Digest

Summarize unread messages across all chats.

```python
#!/usr/bin/env python3
"""Daily digest of unread Telegram messages."""

from telegram_client import TelegramClient

def main():
    client = TelegramClient()

    try:
        # Get chats with unread messages
        chats = client.list_chats(unread_only=True, limit=50)

        if not chats:
            print("No unread messages!")
            return

        print(f"Found {len(chats)} chats with unread messages\n")

        for chat in chats:
            print(f"=== {chat['name']} ({chat.get('unread_count', '?')} unread) ===")

            # Get recent messages
            messages = client.get_messages(chat['id'], page_size=10)
            print(messages)
            print()

    finally:
        client.close()

if __name__ == "__main__":
    main()
```

---

## Example 2: Send Message

Send a message to a specific chat.

```python
#!/usr/bin/env python3
"""Send a message to a Telegram chat."""

import sys
from telegram_client import TelegramClient, TelegramClientError

def main():
    if len(sys.argv) < 3:
        print("Usage: python send_message.py <chat_id> <message>")
        sys.exit(1)

    chat_id = sys.argv[1]
    message = sys.argv[2]

    # Try to convert to int if numeric
    try:
        chat_id = int(chat_id)
    except ValueError:
        pass

    client = TelegramClient()

    try:
        result = client.send_message(chat_id=chat_id, message=message)
        print(f"Sent: {result}")
    except TelegramClientError as e:
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    main()
```

---

## Example 3: Search Messages

Search for messages in a chat.

```python
#!/usr/bin/env python3
"""Search messages in a Telegram chat."""

import sys
from telegram_client import TelegramClient

def main():
    if len(sys.argv) < 3:
        print("Usage: python search.py <chat_id> <query>")
        sys.exit(1)

    chat_id = sys.argv[1]
    query = sys.argv[2]

    try:
        chat_id = int(chat_id)
    except ValueError:
        pass

    client = TelegramClient()

    try:
        results = client.search_messages(chat_id=chat_id, query=query, limit=20)

        if not results:
            print("No messages found.")
            return

        print(f"Found {len(results)} messages:\n")
        for msg in results:
            print(f"[{msg['date']}] {msg.get('text', '(no text)')[:100]}")

    finally:
        client.close()

if __name__ == "__main__":
    main()
```

---

## Example 4: Channel Monitor

Monitor a channel for specific keywords.

```python
#!/usr/bin/env python3
"""Monitor a channel for keywords."""

import time
from telegram_client import TelegramClient

CHANNEL = "@your_channel"
KEYWORDS = ["important", "urgent", "announcement"]
CHECK_INTERVAL = 300  # 5 minutes

def main():
    client = TelegramClient()
    seen_ids = set()

    print(f"Monitoring {CHANNEL} for: {', '.join(KEYWORDS)}")

    try:
        while True:
            for keyword in KEYWORDS:
                results = client.search_messages(
                    chat_id=CHANNEL,
                    query=keyword,
                    limit=10
                )

                for msg in results:
                    if msg['id'] not in seen_ids:
                        seen_ids.add(msg['id'])
                        print(f"\n[NEW] {keyword.upper()} found:")
                        print(f"  Date: {msg['date']}")
                        print(f"  Text: {msg.get('text', '')[:200]}")

            time.sleep(CHECK_INTERVAL)

    except KeyboardInterrupt:
        print("\nStopped monitoring.")
    finally:
        client.close()

if __name__ == "__main__":
    main()
```

---

## Example 5: Draft Reply

Save a draft reply to a message.

```python
#!/usr/bin/env python3
"""Save a draft reply to a message."""

from telegram_client import TelegramClient

def main():
    client = TelegramClient()

    try:
        # Save a draft reply
        result = client.save_draft(
            chat_id=123456789,  # Replace with actual chat ID
            message="Thanks for your message! I'll get back to you soon.",
            reply_to=42  # Message ID to reply to
        )
        print(result)

    finally:
        client.close()

if __name__ == "__main__":
    main()
```

---

## Example 6: Export Contacts

Export all contacts to JSON.

```python
#!/usr/bin/env python3
"""Export Telegram contacts to JSON."""

import json
from telegram_client import TelegramClient

def main():
    client = TelegramClient()

    try:
        contacts = client.list_contacts()

        with open("telegram_contacts.json", "w") as f:
            json.dump(contacts, f, indent=2)

        print(f"Exported {len(contacts)} contacts to telegram_contacts.json")

    finally:
        client.close()

if __name__ == "__main__":
    main()
```

---

## Example 7: Bulk Archive

Archive all chats matching a pattern.

```python
#!/usr/bin/env python3
"""Archive chats matching a pattern."""

from telegram_client import TelegramClient

ARCHIVE_PATTERN = "Old Project"  # Archive chats containing this

def main():
    client = TelegramClient()

    try:
        chats = client.list_chats(limit=100)

        archived = 0
        for chat in chats:
            if ARCHIVE_PATTERN.lower() in chat.get('name', '').lower():
                print(f"Archiving: {chat['name']}")
                client.archive_chat(chat['id'])
                archived += 1

        print(f"\nArchived {archived} chats.")

    finally:
        client.close()

if __name__ == "__main__":
    main()
```

---

## Running Scripts

### One-time execution
```bash
python script.py
```

### Scheduled (cron)
```bash
# Run digest every morning at 9am
0 9 * * * cd /path/to/scripts && python digest.py >> /var/log/telegram-digest.log 2>&1
```

### As a service (systemd)
```ini
[Unit]
Description=Telegram Channel Monitor
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/scripts
ExecStart=/usr/bin/python3 monitor.py
Restart=always

[Install]
WantedBy=multi-user.target
```

---

## Error Handling

All scripts should handle errors gracefully:

```python
from telegram_client import TelegramClient, TelegramClientError

try:
    client = TelegramClient()
    # ... operations ...
except TelegramClientError as e:
    print(f"Telegram API error: {e}")
except Exception as e:
    print(f"Unexpected error: {e}")
finally:
    client.close()
```
