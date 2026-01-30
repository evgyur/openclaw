#!/usr/bin/env python3
"""
Извлечь стиль письма из канала для последующего создания постов в этом стиле.
Использование: python extract_style.py <chat_id> [sample_size]
"""

import sys
import json
from pathlib import Path
from collections import Counter
import re

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent.parent / 'telegram-mcp-api'))

try:
    from telegram_client import TelegramClient, TelegramClientError
except ImportError:
    print(json.dumps({"error": "telegram_client не найден"}, ensure_ascii=False))
    sys.exit(1)


def analyze_style(messages):
    """Анализирует стиль письма из сообщений."""
    if not messages:
        return None
    
    # Фильтруем только текстовые сообщения
    text_messages = [msg for msg in messages if msg.get('text') and len(msg.get('text', '')) > 20]
    
    if len(text_messages) < 5:
        return {"error": "Недостаточно текстовых сообщений для анализа (нужно минимум 5)"}
    
    # Анализ языка
    ru_chars = sum(1 for msg in text_messages for c in msg.get('text', '') if '\u0400' <= c <= '\u04FF')
    en_chars = sum(1 for msg in text_messages for c in msg.get('text', '') if c.isalpha() and ord(c) < 128)
    total_chars = sum(len(msg.get('text', '')) for msg in text_messages)
    
    # Анализ структуры
    has_bullets = sum(1 for msg in text_messages if re.search(r'[•\-\*]\s', msg.get('text', '')))
    has_numbers = sum(1 for msg in text_messages if re.search(r'\d+[\.\)]\s', msg.get('text', '')))
    has_questions = sum(1 for msg in text_messages if '?' in msg.get('text', ''))
    
    # Анализ длины
    lengths = [len(msg.get('text', '')) for msg in text_messages]
    avg_length = sum(lengths) / len(lengths) if lengths else 0
    
    # Анализ эмодзи
    emoji_pattern = re.compile(r'[😀-🙏🌀-🗿]')
    emoji_count = sum(len(emoji_pattern.findall(msg.get('text', ''))) for msg in text_messages)
    emoji_usage = emoji_count / len(text_messages) if text_messages else 0
    
    # Анализ формальности
    formal_markers = ['вы', 'Вы', 'вас', 'Вас', 'вам', 'Вам']
    casual_markers = ['ты', 'тебе', 'тобой', 'я', 'мы']
    formal_count = sum(1 for msg in text_messages if any(m in msg.get('text', '') for m in formal_markers))
    casual_count = sum(1 for msg in text_messages if any(m in msg.get('text', '') for m in casual_markers))
    
    # Анализ окончаний
    has_ps = sum(1 for msg in text_messages if re.search(r'\bP\.?S\.?', msg.get('text', ''), re.I))
    has_cta = sum(1 for msg in text_messages if re.search(r'(подпис|читай|смотри|переход)', msg.get('text', ''), re.I))
    
    style_guide = {
        "language": {
            "primary": "Russian" if ru_chars > en_chars else "English" if en_chars > ru_chars else "Mixed",
            "russian_ratio": round(ru_chars / total_chars * 100, 1) if total_chars > 0 else 0,
            "english_ratio": round(en_chars / total_chars * 100, 1) if total_chars > 0 else 0
        },
        "structure": {
            "uses_bullets": round(has_bullets / len(text_messages) * 100, 1),
            "uses_numbered_lists": round(has_numbers / len(text_messages) * 100, 1),
            "uses_questions": round(has_questions / len(text_messages) * 100, 1)
        },
        "tone": {
            "formality": "Formal" if formal_count > casual_count else "Casual" if casual_count > formal_count else "Mixed",
            "formal_markers_ratio": round(formal_count / len(text_messages) * 100, 1),
            "casual_markers_ratio": round(casual_count / len(text_messages) * 100, 1)
        },
        "formatting": {
            "average_length": round(avg_length),
            "min_length": min(lengths) if lengths else 0,
            "max_length": max(lengths) if lengths else 0,
            "emoji_per_message": round(emoji_usage, 2)
        },
        "endings": {
            "uses_ps": round(has_ps / len(text_messages) * 100, 1),
            "uses_cta": round(has_cta / len(text_messages) * 100, 1)
        },
        "sample_size": len(text_messages)
    }
    
    return style_guide


def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "Usage: python extract_style.py <chat_id> [sample_size]"
        }, ensure_ascii=False))
        sys.exit(1)
    
    chat_id = sys.argv[1]
    sample_size = int(sys.argv[2]) if len(sys.argv) > 2 else 30
    
    try:
        chat_id = int(chat_id)
    except ValueError:
        pass
    
    client = TelegramClient()
    
    try:
        # Получаем информацию о чате
        chat_info = client.get_chat(chat_id)
        chat_name = chat_info.get('name', 'Unknown') if isinstance(chat_info, dict) else 'Unknown'
        
        # Получаем сообщения для анализа
        # get_messages возвращает строку с форматированием, нужно распарсить
        messages_str = client.get_messages(chat_id=chat_id, page_size=sample_size)
        
        # Парсим формат "ID: ... | Author | Date: ... | Message: ..."
        messages = []
        if isinstance(messages_str, str):
            # Разбиваем по строкам
            lines = messages_str.strip().split('\n')
            for line in lines:
                if '| Message:' in line:
                    try:
                        # Парсим формат: "ID: 123 | Author | Date: ... | Message: text"
                        parts = line.split('| Message:')
                        if len(parts) == 2:
                            msg_text = parts[1].strip()
                            # Извлекаем ID
                            id_part = parts[0].split('|')[0]
                            msg_id = id_part.replace('ID:', '').strip()
                            messages.append({
                                'id': int(msg_id) if msg_id.isdigit() else msg_id,
                                'text': msg_text
                            })
                    except:
                        continue
        
        if not messages:
            print(json.dumps({
                "error": f"Не удалось получить сообщения из чата {chat_id} или формат не поддерживается"
            }, ensure_ascii=False))
            sys.exit(1)
        
        # Анализируем стиль
        style_guide = analyze_style(messages)
        
        if style_guide and "error" in style_guide:
            print(json.dumps(style_guide, ensure_ascii=False, indent=2))
            sys.exit(1)
        
        result = {
            "chat_id": str(chat_id),
            "chat_name": chat_name,
            "style_guide": style_guide,
            "analyzed_messages": len(messages)
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
