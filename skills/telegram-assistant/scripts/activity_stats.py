#!/usr/bin/env python3
"""
Статистика активности в чате: кто больше всего пишет, в какое время, дни недели.
Использование: python activity_stats.py <chat_id> [limit] [days]
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


def parse_message_date(date_str):
    """Парсит дату из формата API."""
    try:
        return datetime.strptime(date_str.split('+')[0], "%Y-%m-%d %H:%M:%S")
    except:
        return None


def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "Usage: python activity_stats.py <chat_id> [limit] [days]"
        }, ensure_ascii=False))
        sys.exit(1)
    
    chat_id = sys.argv[1]
    limit = int(sys.argv[2]) if len(sys.argv) > 2 else 200
    days = int(sys.argv[3]) if len(sys.argv) > 3 else 30
    
    try:
        chat_id = int(chat_id)
    except ValueError:
        pass
    
    client = TelegramClient()
    
    try:
        # Получаем информацию о чате
        chat_info = client.get_chat(chat_id)
        chat_name = chat_info.get('name', 'Unknown') if isinstance(chat_info, dict) else 'Unknown'
        
        # Получаем сообщения
        messages_str = client.get_messages(chat_id=chat_id, page_size=limit)
        
        # Парсим сообщения
        messages = []
        if isinstance(messages_str, str):
            lines = messages_str.strip().split('\n')
            for line in lines:
                if '| Message:' in line:
                    try:
                        parts = line.split('| Message:')
                        if len(parts) == 2:
                            msg_text = parts[1].strip()
                            header = parts[0]
                            id_part = header.split('|')[0].replace('ID:', '').strip()
                            date_part = [p for p in header.split('|') if 'Date:' in p]
                            author_part = [p for p in header.split('|') if 'Date:' not in p and 'ID:' not in p]
                            
                            date_str = date_part[0].replace('Date:', '').strip() if date_part else ''
                            author = author_part[0].strip() if author_part else 'Unknown'
                            
                            messages.append({
                                'id': int(id_part) if id_part.isdigit() else id_part,
                                'text': msg_text,
                                'date': date_str,
                                'author': author
                            })
                    except:
                        continue
        
        if not messages:
            print(json.dumps({
                "error": f"Не удалось получить сообщения из чата {chat_id}"
            }, ensure_ascii=False))
            sys.exit(1)
        
        # Фильтруем по дате
        cutoff_date = datetime.now() - timedelta(days=days)
        filtered = []
        for msg in messages:
            date_str = msg.get('date', '')
            if date_str:
                msg_date = parse_message_date(date_str)
                if msg_date and msg_date >= cutoff_date:
                    filtered.append(msg)
        
        # Анализируем статистику
        authors = [msg.get('author', 'Unknown') for msg in filtered]
        hours = []
        weekdays = []
        
        for msg in filtered:
            date_str = msg.get('date', '')
            if date_str:
                msg_date = parse_message_date(date_str)
                if msg_date:
                    hours.append(msg_date.hour)
                    weekdays.append(msg_date.strftime('%A'))
        
        stats = {
            "chat_id": str(chat_id),
            "chat_name": chat_name,
            "period_days": days,
            "total_messages": len(filtered),
            "unique_authors": len(set(authors)),
            "most_active_authors": dict(Counter(authors).most_common(10)),
            "activity_by_hour": dict(Counter(hours)),
            "activity_by_weekday": dict(Counter(weekdays)),
            "average_messages_per_day": round(len(filtered) / max(1, days), 2),
            "peak_hour": Counter(hours).most_common(1)[0][0] if hours else None,
            "peak_weekday": Counter(weekdays).most_common(1)[0] if weekdays else None
        }
        
        print(json.dumps(stats, ensure_ascii=False, indent=2))
        
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
