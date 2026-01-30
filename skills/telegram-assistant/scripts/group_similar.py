#!/usr/bin/env python3
"""
Группировка похожих сообщений в чате (поиск дубликатов и повторов).
Использование: python group_similar.py <chat_id> [limit] [similarity_threshold]
"""

import sys
import json
from pathlib import Path
from collections import defaultdict
from difflib import SequenceMatcher

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent.parent / 'telegram-mcp-api'))

try:
    from telegram_client import TelegramClient, TelegramClientError
except ImportError:
    print(json.dumps({"error": "telegram_client не найден"}, ensure_ascii=False))
    sys.exit(1)


def similarity(text1, text2):
    """Вычисляет схожесть двух текстов (0-1)."""
    return SequenceMatcher(None, text1.lower(), text2.lower()).ratio()


def group_similar_messages(messages, threshold=0.7):
    """Группирует похожие сообщения."""
    groups = []
    used = set()
    
    for i, msg1 in enumerate(messages):
        if i in used:
            continue
        
        text1 = msg1.get('text', '')
        if not text1 or len(text1) < 10:
            continue
        
        group = [msg1]
        used.add(i)
        
        for j, msg2 in enumerate(messages[i+1:], start=i+1):
            if j in used:
                continue
            
            text2 = msg2.get('text', '')
            if not text2:
                continue
            
            sim = similarity(text1, text2)
            if sim >= threshold:
                group.append(msg2)
                used.add(j)
        
        if len(group) > 1:
            groups.append({
                "count": len(group),
                "similarity_threshold": threshold,
                "sample_text": text1[:200],
                "messages": group[:5]  # Показываем первые 5
            })
    
    return groups


def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "Usage: python group_similar.py <chat_id> [limit] [similarity_threshold]"
        }, ensure_ascii=False))
        sys.exit(1)
    
    chat_id = sys.argv[1]
    limit = int(sys.argv[2]) if len(sys.argv) > 2 else 100
    threshold = float(sys.argv[3]) if len(sys.argv) > 3 else 0.7
    
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
                            
                            messages.append({
                                'id': int(id_part) if id_part.isdigit() else id_part,
                                'text': msg_text,
                                'date': date_part[0].replace('Date:', '').strip() if date_part else ''
                            })
                    except:
                        continue
        elif isinstance(messages_str, list):
            messages = messages_str
        
        if not messages:
            print(json.dumps({
                "error": f"Не удалось получить сообщения из чата {chat_id}"
            }, ensure_ascii=False))
            sys.exit(1)
        
        # Группируем похожие
        groups = group_similar_messages(messages, threshold)
        
        result = {
            "chat_id": str(chat_id),
            "chat_name": chat_name,
            "total_messages": len(messages),
            "similarity_threshold": threshold,
            "similar_groups": len(groups),
            "groups": groups
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
