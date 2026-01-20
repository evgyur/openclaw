#!/usr/bin/env python3
"""
Сравнение активности между несколькими чатами.
Использование: python compare_chats.py <chat_id1> <chat_id2> [chat_id3] ... [days]
"""

import sys
import json
from pathlib import Path
from datetime import datetime, timedelta
from collections import Counter

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent.parent / 'telegram-mcp-api'))

try:
    from telegram_client import TelegramClient, TelegramClientError
except ImportError:
    print(json.dumps({"error": "telegram_client не найден"}, ensure_ascii=False))
    sys.exit(1)


def get_chat_stats(client, chat_id, days):
    """Получает статистику чата за период."""
    try:
        chat_info = client.get_chat(chat_id)
        chat_name = chat_info.get('name', 'Unknown') if isinstance(chat_info, dict) else 'Unknown'
        
        messages_str = client.get_messages(chat_id=chat_id, page_size=min(days * 20, 200))
        
        messages = []
        if isinstance(messages_str, str):
            lines = messages_str.strip().split('\n')
            for line in lines:
                if '| Message:' in line:
                    try:
                        parts = line.split('| Message:')
                        if len(parts) == 2:
                            date_part = [p for p in parts[0].split('|') if 'Date:' in p]
                            date_str = date_part[0].replace('Date:', '').strip() if date_part else ''
                            
                            if date_str:
                                try:
                                    msg_date = datetime.strptime(date_str.split('+')[0], "%Y-%m-%d %H:%M:%S")
                                    cutoff = datetime.now() - timedelta(days=days)
                                    if msg_date >= cutoff:
                                        messages.append({'date': date_str})
                                except:
                                    pass
                    except:
                        continue
        
        return {
            "chat_id": str(chat_id),
            "chat_name": chat_name,
            "messages_count": len(messages),
            "messages_per_day": round(len(messages) / max(1, days), 2)
        }
    except:
        return {
            "chat_id": str(chat_id),
            "chat_name": "Error",
            "messages_count": 0,
            "messages_per_day": 0
        }


def main():
    if len(sys.argv) < 3:
        print(json.dumps({
            "error": "Usage: python compare_chats.py <chat_id1> <chat_id2> [chat_id3] ... [days]"
        }, ensure_ascii=False))
        sys.exit(1)
    
    # Парсим аргументы
    chat_ids = []
    days = 7
    
    for arg in sys.argv[1:]:
        try:
            days = int(arg)
        except ValueError:
            try:
                chat_id = int(arg)
                chat_ids.append(chat_id)
            except ValueError:
                chat_ids.append(arg)  # username
    
    if len(chat_ids) < 2:
        print(json.dumps({
            "error": "Нужно указать минимум 2 чата для сравнения"
        }, ensure_ascii=False))
        sys.exit(1)
    
    client = TelegramClient()
    
    try:
        stats = []
        for chat_id in chat_ids:
            stat = get_chat_stats(client, chat_id, days)
            stats.append(stat)
        
        # Сортируем по активности
        stats_sorted = sorted(stats, key=lambda x: x['messages_count'], reverse=True)
        
        result = {
            "period_days": days,
            "comparison": stats_sorted,
            "most_active": stats_sorted[0] if stats_sorted else None,
            "least_active": stats_sorted[-1] if stats_sorted else None
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
