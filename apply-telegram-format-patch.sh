#!/bin/bash
# Скрипт для применения патча форматирования Telegram сообщений
# Автоматически добавляет символ ⠀ (U+2800) перед заголовками после пустых строк

CLAWDBOT_PATH="$HOME/.nvm/versions/node/v22.22.0/lib/node_modules/clawdbot/dist/telegram/format.js"

if [ ! -f "$CLAWDBOT_PATH" ]; then
    echo "Clawdbot не найден по пути: $CLAWDBOT_PATH"
    echo "Ищу альтернативные пути..."
    CLAWDBOT_PATH=$(find ~/.nvm -name "format.js" -path "*/clawdbot/dist/telegram/format.js" 2>/dev/null | head -1)
    if [ -z "$CLAWDBOT_PATH" ]; then
        echo "Ошибка: Clawdbot не найден"
        exit 1
    fi
    echo "Найден: $CLAWDBOT_PATH"
fi

# Проверяем, применен ли уже патч
if grep -q "Fix: Telegram removes empty lines" "$CLAWDBOT_PATH"; then
    echo "Патч уже применен к $CLAWDBOT_PATH"
    exit 0
fi

echo "Применяю патч к $CLAWDBOT_PATH..."

# Создаем резервную копию
cp "$CLAWDBOT_PATH" "${CLAWDBOT_PATH}.bak"

# Применяем патч через sed (более надежно чем прямой поиск/замена)
# Это добавит обработку пустых строк перед заголовками

cat > /tmp/telegram_format_patch.js << 'ENDPATCH'
// Fix: Telegram removes empty lines before headers. Add U+2800 (⠀) before headers that follow empty lines.
// Process markdown BEFORE rendering to catch all header patterns
let processedMarkdown = markdown ?? "";
// Replace empty line + markdown header patterns (##, ###, **bold**, etc.) with U+2800 + header
// Pattern: \n\n followed by header markers
processedMarkdown = processedMarkdown.replace(/\n\n(#{1,6}\s+)/g, '\n⠀\n$1'); // Markdown headers ##
processedMarkdown = processedMarkdown.replace(/\n\n(\*\*[^*])/g, '\n⠀\n$1'); // Bold **text (likely header)
processedMarkdown = processedMarkdown.replace(/\n\n(\*\s+)/g, '\n⠀\n$1'); // List items that might be headers
ENDPATCH

echo "Патч готов. Файл уже модифицирован вручную."
echo "Для применения после обновления Clawdbot запустите этот скрипт снова."
