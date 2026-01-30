#!/usr/bin/env python3
"""
Сохранить черновик сообщения.
Использование: python save_draft.py <chat_id> <message> [reply_to_message_id]
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
            "error": "Usage: python save_draft.py <chat_id> <message> [reply_to_message_id]"
        }, ensure_ascii=False))
        sys.exit(1)
    
    chat_id = sys.argv[1]
    message = sys.argv[2]
    reply_to = int(sys.argv[3]) if len(sys.argv) > 3 else None
    
    # Пытаемся преобразовать в int
    try:
        chat_id = int(chat_id)
    except ValueError:
        pass
    
    client = TelegramClient()
    
    try:
        result = client.save_draft(
            chat_id=chat_id,
            message=message,
            reply_to=reply_to
        )
        
        output = {
            "success": True,
            "chat_id": str(chat_id),
            "message_preview": message[:100] + "..." if len(message) > 100 else message,
            "reply_to": reply_to,
            "result": result
        }
        
        print(json.dumps(output, ensure_ascii=False, indent=2))
        
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
