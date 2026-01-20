#!/usr/bin/env python3
"""
Получить сообщения из чата.
Использование: python get_chat_messages.py <chat_id> [limit]
"""

import sys
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent.parent / 'telegram-mcp-api'))

try:
    from telegram_client import TelegramClient, TelegramClientError, RateLimitError, FloodWaitError
except ImportError:
    print(json.dumps({"error": "telegram_client не найден"}, ensure_ascii=False))
    sys.exit(1)


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python get_chat_messages.py <chat_id> [limit]"}, ensure_ascii=False))
        sys.exit(1)
    
    chat_id = sys.argv[1]
    limit = int(sys.argv[2]) if len(sys.argv) > 2 else 50
    
    # Пытаемся преобразовать в int, если это число
    try:
        chat_id = int(chat_id)
    except ValueError:
        pass  # Оставляем как строку (username)
    
    client = TelegramClient()
    
    try:
        messages = client.get_messages(chat_id=chat_id, page_size=limit)
        
        result = {
            "chat_id": str(chat_id),
            "messages_count": len(messages) if messages else 0,
            "messages": messages or []
        }
        
        print(json.dumps(result, ensure_ascii=False, indent=2))
        
    except RateLimitError as e:
        print(json.dumps({
            "error": f"Rate limit exceeded: {e}",
            "retry_after": e.retry_after,
            "message": f"Подождите {e.retry_after:.1f} секунд перед следующей попыткой"
        }, ensure_ascii=False))
        sys.exit(1)
    except FloodWaitError as e:
        print(json.dumps({
            "error": f"Flood wait required: {e}",
            "wait_time": e.wait_time,
            "retry_after": e.wait_time,
            "message": f"Telegram требует подождать {e.wait_time:.1f} секунд перед следующей попыткой"
        }, ensure_ascii=False))
        sys.exit(1)
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
