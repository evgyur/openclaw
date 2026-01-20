#!/usr/bin/env python3
"""
Получить список всех чатов.
Использование: python list_chats.py [limit]
"""

import sys
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent.parent / 'telegram-mcp-api'))

try:
    from telegram_client import TelegramClient, TelegramClientError
except ImportError:
    print(json.dumps({"error": "telegram_client не найден"}, ensure_ascii=False))
    sys.exit(1)


def main():
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 100
    
    client = TelegramClient()
    
    try:
        chats = client.list_chats(limit=limit)
        
        result = {
            "total": len(chats) if chats else 0,
            "chats": chats or []
        }
        
        print(json.dumps(result, ensure_ascii=False, indent=2))
        
    except TelegramClientError as e:
        print(json.dumps({"error": f"Telegram API error: {e}"}, ensure_ascii=False))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": f"Unexpected error: {e}"}, ensure_ascii=False))
        sys.exit(1)
    finally:
        client.close()


if __name__ == "__main__":
    main()
