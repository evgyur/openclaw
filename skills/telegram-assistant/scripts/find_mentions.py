#!/usr/bin/env python3
"""
Поиск всех упоминаний пользователя в чатах.
Использование: python find_mentions.py [username] [limit_chats] [limit_messages]
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
    username = sys.argv[1] if len(sys.argv) > 1 else None
    limit_chats = int(sys.argv[2]) if len(sys.argv) > 2 else 20
    limit_messages = int(sys.argv[3]) if len(sys.argv) > 3 else 50
    
    if not username:
        # Получаем информацию о текущем пользователе
        client = TelegramClient()
        try:
            me = client.get_me()
            if isinstance(me, dict):
                username = me.get('username', '')
            client.close()
        except:
            pass
    
    if not username:
        print(json.dumps({
            "error": "Usage: python find_mentions.py [username] [limit_chats] [limit_messages]"
        }, ensure_ascii=False))
        sys.exit(1)
    
    # Убираем @ если есть
    username = username.lstrip('@')
    search_query = f"@{username}"
    
    client = TelegramClient()
    
    try:
        # Получаем список чатов
        all_chats = client.list_chats(limit=limit_chats)
        
        mentions = []
        
        for chat in all_chats[:limit_chats]:
            try:
                chat_id = chat.get('id')
                chat_name = chat.get('name', 'Unknown')
                
                # Ищем упоминания
                results = client.search_messages(
                    chat_id=chat_id,
                    query=search_query,
                    limit=limit_messages
                )
                
                if results:
                    mentions.append({
                        "chat_id": str(chat_id),
                        "chat_name": chat_name,
                        "mentions_count": len(results),
                        "recent_mentions": results[:5]  # Первые 5
                    })
            except:
                continue
        
        result = {
            "username": username,
            "search_query": search_query,
            "chats_checked": len(all_chats),
            "chats_with_mentions": len(mentions),
            "total_mentions": sum(m.get('mentions_count', 0) for m in mentions),
            "mentions_by_chat": mentions
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
