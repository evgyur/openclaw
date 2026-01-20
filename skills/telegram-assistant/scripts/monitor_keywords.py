#!/usr/bin/env python3
"""
Мониторинг чата/канала на наличие ключевых слов.
Использование: python monitor_keywords.py <chat_id> <keyword1> [keyword2] ... [limit]
"""

import sys
import json
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent.parent / 'telegram-mcp-api'))

try:
    from telegram_client import TelegramClient, TelegramClientError
except ImportError:
    print(json.dumps({"error": "telegram_client не найден"}, ensure_ascii=False))
    sys.exit(1)


def main():
    if len(sys.argv) < 3:
        print(json.dumps({
            "error": "Usage: python monitor_keywords.py <chat_id> <keyword1> [keyword2] ... [limit]"
        }, ensure_ascii=False))
        sys.exit(1)
    
    chat_id = sys.argv[1]
    keywords = []
    limit = 100
    
    # Парсим аргументы
    for arg in sys.argv[2:]:
        try:
            limit = int(arg)
        except ValueError:
            keywords.append(arg.lower())
    
    if not keywords:
        print(json.dumps({
            "error": "Нужно указать хотя бы одно ключевое слово"
        }, ensure_ascii=False))
        sys.exit(1)
    
    try:
        chat_id = int(chat_id)
    except ValueError:
        pass
    
    client = TelegramClient()
    
    try:
        # Получаем информацию о чате
        chat_info = client.get_chat(chat_id)
        chat_name = chat_info.get('name', 'Unknown') if isinstance(chat_info, dict) else 'Unknown'
        
        # Ищем по каждому ключевому слову
        all_matches = {}
        
        for keyword in keywords:
            results = client.search_messages(chat_id=chat_id, query=keyword, limit=limit)
            if results:
                all_matches[keyword] = results[:20]  # Ограничиваем 20 результатами на слово
        
        # Формируем результат
        result = {
            "chat_id": str(chat_id),
            "chat_name": chat_name,
            "keywords": keywords,
            "timestamp": datetime.now().isoformat(),
            "matches": {
                keyword: {
                    "count": len(matches),
                    "messages": matches[:10]  # Первые 10 для каждого ключевого слова
                }
                for keyword, matches in all_matches.items()
            },
            "total_matches": sum(len(matches) for matches in all_matches.values())
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
