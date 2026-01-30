#!/usr/bin/env python3
"""
Получить список чатов с непрочитанными сообщениями.
Использование: python get_unread_chats.py
"""

import sys
import json
from pathlib import Path

# Добавляем путь к telegram-mcp-api
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent.parent / 'telegram-mcp-api'))

try:
    from telegram_client import TelegramClient, TelegramClientError
except ImportError:
    print(json.dumps({"error": "telegram_client не найден. Убедитесь, что telegram-mcp-api установлен."}, ensure_ascii=False))
    sys.exit(1)


def main():
    client = TelegramClient()
    
    try:
        # Получаем все чаты
        all_chats = client.list_chats(limit=100)
        
        if not all_chats:
            print(json.dumps({"unread_count": 0, "chats": []}, ensure_ascii=False))
            return
        
        # Фильтруем чаты с непрочитанными
        unread_chats = []
        for chat in all_chats:
            unread_count = chat.get('unread_count', 0)
            if unread_count > 0:
                unread_chats.append({
                    'id': chat.get('id'),
                    'name': chat.get('name', 'Unknown'),
                    'unread_count': unread_count,
                    'type': chat.get('type', 'unknown')
                })
        
        result = {
            "unread_count": len(unread_chats),
            "total_chats": len(all_chats),
            "chats": unread_chats
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
