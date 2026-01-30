#!/usr/bin/env python3
"""
Поиск сообщений в чате по ключевому слову или фразе.
Использование: python search_messages.py <chat_id> <query> [limit] [from_user]
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
    if len(sys.argv) < 3:
        print(json.dumps({
            "error": "Usage: python search_messages.py <chat_id> <query> [limit] [from_user]"
        }, ensure_ascii=False))
        sys.exit(1)
    
    chat_id = sys.argv[1]
    query = sys.argv[2]
    limit = int(sys.argv[3]) if len(sys.argv) > 3 else 20
    from_user = sys.argv[4] if len(sys.argv) > 4 else None
    
    try:
        chat_id = int(chat_id)
    except ValueError:
        pass
    
    if from_user:
        try:
            from_user = int(from_user)
        except ValueError:
            pass
    
    client = TelegramClient()
    
    try:
        results = client.search_messages(
            chat_id=chat_id,
            query=query,
            limit=limit,
            from_user=from_user
        )
        
        result = {
            "chat_id": str(chat_id),
            "query": query,
            "found": len(results) if results else 0,
            "limit": limit,
            "from_user": from_user,
            "messages": results or []
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
