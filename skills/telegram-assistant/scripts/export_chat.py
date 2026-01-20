#!/usr/bin/env python3
"""
Экспорт сообщений чата в файл (JSON, CSV или текстовый формат).
Использование: python export_chat.py <chat_id> [limit] [format] [output_file]
"""

import sys
import json
import csv
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent.parent / 'telegram-mcp-api'))

try:
    from telegram_client import TelegramClient, TelegramClientError, RateLimitError, FloodWaitError
except ImportError:
    print(json.dumps({"error": "telegram_client не найден"}, ensure_ascii=False))
    sys.exit(1)


def parse_messages(messages_str):
    """Парсит сообщения из строкового формата API."""
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
                        
                        messages.append({
                            'id': int(id_part) if id_part.isdigit() else id_part,
                            'text': msg_text,
                            'date': date_part[0].replace('Date:', '').strip() if date_part else '',
                            'author': author_part[0].strip() if author_part else 'Unknown'
                        })
                except:
                    continue
    elif isinstance(messages_str, list):
        messages = messages_str
    
    return messages


def export_json(messages, output_file):
    """Экспорт в JSON."""
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(messages, f, ensure_ascii=False, indent=2)
    return len(messages)


def export_csv(messages, output_file):
    """Экспорт в CSV."""
    with open(output_file, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['id', 'date', 'author', 'text'])
        writer.writeheader()
        for msg in messages:
            writer.writerow({
                'id': msg.get('id', ''),
                'date': msg.get('date', ''),
                'author': msg.get('author', 'Unknown'),
                'text': msg.get('text', '')
            })
    return len(messages)


def export_txt(messages, output_file):
    """Экспорт в текстовый формат."""
    with open(output_file, 'w', encoding='utf-8') as f:
        for msg in messages:
            f.write(f"[{msg.get('date', '')}] {msg.get('author', 'Unknown')}: {msg.get('text', '')}\n\n")
    return len(messages)


def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "Usage: python export_chat.py <chat_id> [limit] [format] [output_file]"
        }, ensure_ascii=False))
        sys.exit(1)
    
    chat_id = sys.argv[1]
    limit = int(sys.argv[2]) if len(sys.argv) > 2 else 100
    format_type = sys.argv[3] if len(sys.argv) > 3 else 'json'
    output_file = sys.argv[4] if len(sys.argv) > 4 else None
    
    try:
        chat_id = int(chat_id)
    except ValueError:
        pass
    
    # Определяем имя файла
    if not output_file:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = f"telegram_export_{chat_id}_{timestamp}.{format_type}"
    
    client = TelegramClient()
    
    try:
        # Получаем информацию о чате
        chat_info = client.get_chat(chat_id)
        chat_name = chat_info.get('name', 'Unknown') if isinstance(chat_info, dict) else 'Unknown'
        
        # Получаем сообщения
        messages_str = client.get_messages(chat_id=chat_id, page_size=limit)
        messages = parse_messages(messages_str)
        
        if not messages:
            print(json.dumps({
                "error": f"Не удалось получить сообщения из чата {chat_id}"
            }, ensure_ascii=False))
            sys.exit(1)
        
        # Экспортируем
        if format_type == 'json':
            count = export_json(messages, output_file)
        elif format_type == 'csv':
            count = export_csv(messages, output_file)
        elif format_type == 'txt':
            count = export_txt(messages, output_file)
        else:
            print(json.dumps({
                "error": f"Неподдерживаемый формат: {format_type}. Используйте: json, csv, txt"
            }, ensure_ascii=False))
            sys.exit(1)
        
        result = {
            "success": True,
            "chat_id": str(chat_id),
            "chat_name": chat_name,
            "exported_messages": count,
            "format": format_type,
            "output_file": output_file,
            "file_path": str(Path(output_file).absolute())
        }
        
        print(json.dumps(result, ensure_ascii=False, indent=2))
        
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
