#!/usr/bin/env python3
"""
Создать саммари (сводку) чата или канала за определенный период.
Использование: python summarize_chat.py <chat_id> [limit] [query]
"""

import sys
import json
from pathlib import Path
from datetime import datetime, timedelta
import re

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent.parent / 'telegram-mcp-api'))

try:
    from telegram_client import TelegramClient, TelegramClientError
except ImportError:
    print(json.dumps({"error": "telegram_client не найден"}, ensure_ascii=False))
    sys.exit(1)


def extract_key_themes(messages):
    """Извлекает ключевые темы из сообщений."""
    if not messages:
        return []
    
    # Простой анализ: ищем часто упоминаемые слова (исключая стоп-слова)
    stop_words = {'и', 'в', 'на', 'с', 'по', 'для', 'от', 'до', 'из', 'к', 'о', 'у', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'}
    
    words = []
    for msg in messages:
        text = msg.get('text', '').lower()
        # Извлекаем слова (кириллица и латиница)
        words.extend(re.findall(r'\b[а-яёa-z]{3,}\b', text))
    
    # Подсчитываем частоту
    from collections import Counter
    word_freq = Counter(w for w in words if w not in stop_words)
    
    return [word for word, count in word_freq.most_common(10)]


def categorize_messages(messages):
    """Категоризирует сообщения по типам."""
    categories = {
        "questions": [],
        "announcements": [],
        "links": [],
        "decisions": [],
        "discussions": []
    }
    
    for msg in messages:
        text = msg.get('text', '')
        
        # Вопросы
        if '?' in text or re.search(r'\b(как|что|почему|когда|где|кто)\b', text, re.I):
            categories["questions"].append(msg)
        
        # Объявления (слова-маркеры)
        if re.search(r'\b(объявля|анонс|новость|релиз|запуск)\b', text, re.I):
            categories["announcements"].append(msg)
        
        # Ссылки
        if re.search(r'http[s]?://|t\.me/', text):
            categories["links"].append(msg)
        
        # Решения (маркеры решений)
        if re.search(r'\b(решил|выбрал|будем|сделаем|принято)\b', text, re.I):
            categories["decisions"].append(msg)
        
        # Остальное - обсуждения
        if text and len(text) > 50:
            categories["discussions"].append(msg)
    
    return categories


def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "Usage: python summarize_chat.py <chat_id> [limit] [query]"
        }, ensure_ascii=False))
        sys.exit(1)
    
    chat_id = sys.argv[1]
    limit = int(sys.argv[2]) if len(sys.argv) > 2 else 100
    query = sys.argv[3] if len(sys.argv) > 3 else None
    
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
        if query:
            messages = client.search_messages(chat_id=chat_id, query=query, limit=limit)
        else:
            messages_str = client.get_messages(chat_id=chat_id, page_size=limit)
            # Парсим формат "ID: ... | Author | Date: ... | Message: ..."
            messages = []
            if isinstance(messages_str, str):
                lines = messages_str.strip().split('\n')
                for line in lines:
                    if '| Message:' in line:
                        try:
                            parts = line.split('| Message:')
                            if len(parts) == 2:
                                msg_text = parts[1].strip()
                                id_part = parts[0].split('|')[0]
                                msg_id = id_part.replace('ID:', '').strip()
                                messages.append({
                                    'id': int(msg_id) if msg_id.isdigit() else msg_id,
                                    'text': msg_text
                                })
                        except:
                            continue
            elif isinstance(messages_str, list):
                messages = messages_str
        
        if not messages:
            print(json.dumps({
                "summary": f"Нет сообщений в чате {chat_name}",
                "chat_id": str(chat_id),
                "chat_name": chat_name
            }, ensure_ascii=False, indent=2))
            return
        
        # Анализируем сообщения
        categories = categorize_messages(messages)
        key_themes = extract_key_themes(messages)
        
        # Формируем саммари
        summary = {
            "chat_id": str(chat_id),
            "chat_name": chat_name,
            "timestamp": datetime.now().isoformat(),
            "period": f"Последние {limit} сообщений",
            "total_messages": len(messages),
            "key_themes": key_themes,
            "categories": {
                "questions": len(categories["questions"]),
                "announcements": len(categories["announcements"]),
                "links": len(categories["links"]),
                "decisions": len(categories["decisions"]),
                "discussions": len(categories["discussions"])
            },
            "sample_messages": {
                "questions": [{"id": m.get("id"), "text": m.get("text", "")[:200]} for m in categories["questions"][:3]],
                "announcements": [{"id": m.get("id"), "text": m.get("text", "")[:200]} for m in categories["announcements"][:3]],
                "decisions": [{"id": m.get("id"), "text": m.get("text", "")[:200]} for m in categories["decisions"][:3]]
            }
        }
        
        print(json.dumps(summary, ensure_ascii=False, indent=2))
        
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
