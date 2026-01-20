#!/usr/bin/env python3
"""
Получить дайджест непрочитанных сообщений.
Использование: python get_digest.py
"""

import sys
import json
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent.parent / 'telegram-mcp-api'))

try:
    from telegram_client import TelegramClient, TelegramClientError, RateLimitError, FloodWaitError
except ImportError:
    print(json.dumps({"error": "telegram_client не найден"}, ensure_ascii=False))
    sys.exit(1)


def main():
    client = TelegramClient()
    
    try:
        # Получаем чаты с непрочитанными
        all_chats = client.list_chats(limit=100)
        
        unread_chats = []
        for chat in all_chats:
            unread_count = chat.get('unread_count', 0)
            if unread_count > 0:
                unread_chats.append(chat)
        
        if not unread_chats:
            print(json.dumps({
                "summary": "Нет непрочитанных сообщений",
                "unread_count": 0,
                "chats": []
            }, ensure_ascii=False, indent=2))
            return
        
        # Получаем сообщения для каждого чата
        digest = {
            "timestamp": datetime.now().isoformat(),
            "total_unread_chats": len(unread_chats),
            "chats": []
        }
        
        for chat in unread_chats[:20]:  # Ограничиваем 20 чатами
            try:
                messages = client.get_messages(
                    chat_id=chat.get('id'),
                    page_size=min(chat.get('unread_count', 10), 20)
                )
                
                chat_digest = {
                    "id": chat.get('id'),
                    "name": chat.get('name', 'Unknown'),
                    "unread_count": chat.get('unread_count', 0),
                    "type": chat.get('type', 'unknown'),
                    "recent_messages": messages[:10] if messages else []
                }
                
                digest["chats"].append(chat_digest)
            except (RateLimitError, FloodWaitError) as e:
                # При rate limit или flood wait останавливаем обработку и сообщаем пользователю
                wait_time = getattr(e, 'retry_after', getattr(e, 'wait_time', 1.0))
                error_type = "Rate limit" if isinstance(e, RateLimitError) else "Flood wait"
                print(json.dumps({
                    "error": f"{error_type} exceeded: {e}",
                    "retry_after": wait_time,
                    "wait_time": wait_time,
                    "message": f"Подождите {wait_time:.1f} секунд перед следующей попыткой",
                    "partial_digest": digest
                }, ensure_ascii=False, indent=2))
                sys.exit(1)
            except Exception as e:
                # Пропускаем чаты с ошибками
                continue
        
        print(json.dumps(digest, ensure_ascii=False, indent=2))
        
    except (RateLimitError, FloodWaitError) as e:
        wait_time = getattr(e, 'retry_after', getattr(e, 'wait_time', 1.0))
        error_type = "Rate limit" if isinstance(e, RateLimitError) else "Flood wait"
        print(json.dumps({
            "error": f"{error_type} exceeded: {e}",
            "retry_after": wait_time,
            "wait_time": wait_time,
            "message": f"Подождите {wait_time:.1f} секунд перед следующей попыткой"
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
