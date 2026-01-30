#!/bin/bash
# Скрипт для безопасного обновления Clawdbot с сохранением патча форматирования Telegram

set -e

echo "🔄 Обновление Clawdbot с сохранением патча форматирования..."

# Находим путь к Clawdbot
CLAWDBOT_PATH=$(find ~/.nvm -name "format.js" -path "*/clawdbot/dist/telegram/format.js" 2>/dev/null | head -1)

if [ -z "$CLAWDBOT_PATH" ]; then
    echo "❌ Ошибка: Clawdbot не найден"
    exit 1
fi

echo "📦 Найден Clawdbot: $CLAWDBOT_PATH"

# Проверяем текущую версию
CURRENT_VERSION=$(cd "$(dirname "$CLAWDBOT_PATH")/../../.." && npm list clawdbot --depth=0 2>/dev/null | grep clawdbot | sed 's/.*@//' || echo "unknown")
echo "📌 Текущая версия: $CURRENT_VERSION"

# Проверяем последнюю версию
LATEST_VERSION=$(npm view clawdbot version 2>/dev/null)
echo "🆕 Последняя версия: $LATEST_VERSION"

if [ "$CURRENT_VERSION" = "$LATEST_VERSION" ]; then
    echo "✅ Уже установлена последняя версия"
    # Проверяем патч
    if grep -q "Fix: Telegram removes empty lines" "$CLAWDBOT_PATH"; then
        echo "✅ Патч применен"
    else
        echo "⚠️  Патч не применен, применяю..."
        # Применяем патч
    fi
    exit 0
fi

# Обновляем Clawdbot
echo ""
echo "⬆️  Обновляю Clawdbot до версии $LATEST_VERSION..."

# Используем npm из nvm (правильная версия Node)
if [ -f ~/.nvm/nvm.sh ]; then
    source ~/.nvm/nvm.sh
    nvm use v22.22.0 2>/dev/null || nvm use default 2>/dev/null
fi

npm install -g clawdbot@latest

# Находим новый путь (может измениться после обновления)
NEW_CLAWDBOT_PATH=$(find ~/.nvm -name "format.js" -path "*/clawdbot/dist/telegram/format.js" 2>/dev/null | head -1)

if [ -z "$NEW_CLAWDBOT_PATH" ]; then
    echo "❌ Ошибка: Clawdbot не найден после обновления"
    exit 1
fi

echo "📦 Новый путь: $NEW_CLAWDBOT_PATH"

# Проверяем, есть ли уже патч в новой версии
if grep -q "Fix: Telegram removes empty lines" "$NEW_CLAWDBOT_PATH"; then
    echo "✅ Патч уже присутствует в новой версии (возможно, был включен в релиз)"
    exit 0
fi

# Применяем патч
echo ""
echo "🔧 Применяю патч к новой версии..."

# Создаем резервную копию
cp "$NEW_CLAWDBOT_PATH" "${NEW_CLAWDBOT_PATH}.bak"

# Применяем патч через Python (более надежно для многострочных замен)
python3 << PYTHON_PATCH
import re
import sys

file_path = "$NEW_CLAWDBOT_PATH"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Проверяем, есть ли уже патч
if "Fix: Telegram removes empty lines" in content:
    print("Патч уже применен")
    sys.exit(0)

# Патч для markdownToTelegramHtml
pattern1 = r'(export function markdownToTelegramHtml\(markdown\) \{[^}]*?)(const ir = markdownToIR\(markdown \?\? "", \{)'
replacement1 = r'''\1    // Fix: Telegram removes empty lines before headers. Add U+2800 (⠀) before headers that follow empty lines.
    // Process markdown BEFORE rendering to catch all header patterns
    let processedMarkdown = markdown ?? "";
    // Replace empty line + markdown header patterns (##, ###, **bold**, etc.) with U+2800 + header
    // Pattern: \n\n followed by header markers
    processedMarkdown = processedMarkdown.replace(/\\n\\n(#{1,6}\\s+)/g, '\\n⠀\\n$1'); // Markdown headers ##
    processedMarkdown = processedMarkdown.replace(/\\n\\n(\\*\\*[^*])/g, '\\n⠀\\n$1'); // Bold **text (likely header)
    processedMarkdown = processedMarkdown.replace(/\\n\\n(\\*\\s+)/g, '\\n⠀\\n$1'); // List items that might be headers
    
    \2'''

content = re.sub(pattern1, replacement1, content, flags=re.DOTALL)

# Заменяем markdown на processedMarkdown в вызове markdownToIR
content = re.sub(
    r'const ir = markdownToIR\(processedMarkdown, \{',
    r'const ir = markdownToIR(processedMarkdown, {',
    content
)

# Добавляем обработку HTML после рендеринга
pattern2 = r'(let html = renderTelegramHtml\(ir\);)(\s+return html;)'
replacement2 = r'''\1
    // Also fix in HTML: empty line + <b> tag (rendered bold headers)
    html = html.replace(/\\n\\n(<b>)/g, '\\n⠀\\n$1');
\2'''

content = re.sub(pattern2, replacement2, content)

# Патч для markdownToTelegramChunks
pattern3 = r'(export function markdownToTelegramChunks\(markdown, limit\) \{[^}]*?)(const ir = markdownToIR\(markdown \?\? "", \{)'
replacement3 = r'''\1    // Apply same fix as markdownToTelegramHtml
    let processedMarkdown = markdown ?? "";
    processedMarkdown = processedMarkdown.replace(/\\n\\n(#{1,6}\\s+)/g, '\\n⠀\\n$1');
    processedMarkdown = processedMarkdown.replace(/\\n\\n(\\*\\*[^*])/g, '\\n⠀\\n$1');
    processedMarkdown = processedMarkdown.replace(/\\n\\n(\\*\\s+)/g, '\\n⠀\\n$1');
    
    \2'''

content = re.sub(pattern3, replacement3, content, flags=re.DOTALL)

# Заменяем markdown на processedMarkdown в markdownToTelegramChunks
content = re.sub(
    r'const ir = markdownToIR\(processedMarkdown, \{',
    r'const ir = markdownToIR(processedMarkdown, {',
    content
)

# Добавляем обработку HTML в chunks
pattern4 = r'(return chunks\.map\(\(chunk\) => \{[\s\S]*?let html = renderTelegramHtml\(chunk\);)(\s+return \{)'
replacement4 = r'''\1
        html = html.replace(/\\n\\n(<b>)/g, '\\n⠀\\n$1');
\2'''

content = re.sub(pattern4, replacement4, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Патч применен успешно")
PYTHON_PATCH

if [ $? -eq 0 ]; then
    echo "✅ Патч применен"
else
    echo "❌ Ошибка при применении патча, восстанавливаю из резервной копии..."
    cp "${NEW_CLAWDBOT_PATH}.bak" "$NEW_CLAWDBOT_PATH"
    exit 1
fi

echo ""
echo "✅ Обновление завершено!"
echo "🔄 Перезапустите Clawdbot для применения изменений:"
echo "   systemctl --user restart clawdbot-gateway.service"
