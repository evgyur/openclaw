#!/bin/bash
# Простой скрипт для применения патча форматирования Telegram

FILE_PATH="$1"

if [ -z "$FILE_PATH" ]; then
    FILE_PATH=$(find ~/.nvm -name "format.js" -path "*/clawdbot/dist/telegram/format.js" 2>/dev/null | head -1)
fi

if [ -z "$FILE_PATH" ] || [ ! -f "$FILE_PATH" ]; then
    echo "❌ Файл не найден: $FILE_PATH"
    exit 1
fi

echo "📝 Применяю патч к: $FILE_PATH"

# Проверяем, есть ли уже патч
if grep -q "Fix: Telegram removes empty lines" "$FILE_PATH"; then
    echo "✅ Патч уже применен"
    exit 0
fi

# Создаем резервную копию
cp "$FILE_PATH" "${FILE_PATH}.bak"

# Применяем патч через Node.js (более надежно для JS файлов)
node << 'NODE_PATCH'
const fs = require('fs');
const filePath = process.argv[1];

let content = fs.readFileSync(filePath, 'utf8');

// Проверяем, есть ли уже патч
if (content.includes('Fix: Telegram removes empty lines')) {
    console.log('Патч уже применен');
    process.exit(0);
}

// Патч для markdownToTelegramHtml
const function1 = /export function markdownToTelegramHtml\(markdown\) \{[\s\S]*?const ir = markdownToIR\(markdown \?\? "", \{/;
if (function1.test(content)) {
    content = content.replace(
        /(export function markdownToTelegramHtml\(markdown\) \{[\s\S]*?)(const ir = markdownToIR\(markdown \?\? "", \{)/,
        `$1    // Fix: Telegram removes empty lines before headers. Add U+2800 (⠀) before headers that follow empty lines.
    // Process markdown BEFORE rendering to catch all header patterns
    let processedMarkdown = markdown ?? "";
    // Replace empty line + markdown header patterns (##, ###, **bold**, etc.) with U+2800 + header
    // Pattern: \\n\\n followed by header markers
    processedMarkdown = processedMarkdown.replace(/\\n\\n(#{1,6}\\s+)/g, '\\n⠀\\n$1'); // Markdown headers ##
    processedMarkdown = processedMarkdown.replace(/\\n\\n(\\*\\*[^*])/g, '\\n⠀\\n$1'); // Bold **text (likely header)
    processedMarkdown = processedMarkdown.replace(/\\n\\n(\\*\\s+)/g, '\\n⠀\\n$1'); // List items that might be headers
    
    $2`
    );
    
    // Заменяем markdown на processedMarkdown
    content = content.replace(
        /const ir = markdownToIR\(processedMarkdown, \{/,
        'const ir = markdownToIR(processedMarkdown, {'
    );
    
    // Добавляем обработку HTML
    content = content.replace(
        /(let html = renderTelegramHtml\(ir\);)(\s+return html;)/,
        `$1
    // Also fix in HTML: empty line + <b> tag (rendered bold headers)
    html = html.replace(/\\n\\n(<b>)/g, '\\n⠀\\n$1');
$2`
    );
}

// Патч для markdownToTelegramChunks
const function2 = /export function markdownToTelegramChunks\(markdown, limit\) \{[\s\S]*?const ir = markdownToIR\(markdown \?\? "", \{/;
if (function2.test(content)) {
    content = content.replace(
        /(export function markdownToTelegramChunks\(markdown, limit\) \{[\s\S]*?)(const ir = markdownToIR\(markdown \?\? "", \{)/,
        `$1    // Apply same fix as markdownToTelegramHtml
    let processedMarkdown = markdown ?? "";
    processedMarkdown = processedMarkdown.replace(/\\n\\n(#{1,6}\\s+)/g, '\\n⠀\\n$1');
    processedMarkdown = processedMarkdown.replace(/\\n\\n(\\*\\*[^*])/g, '\\n⠀\\n$1');
    processedMarkdown = processedMarkdown.replace(/\\n\\n(\\*\\s+)/g, '\\n⠀\\n$1');
    
    $2`
    );
    
    // Заменяем markdown на processedMarkdown
    content = content.replace(
        /const ir = markdownToIR\(processedMarkdown, \{/,
        'const ir = markdownToIR(processedMarkdown, {'
    );
    
    // Добавляем обработку HTML в chunks
    content = content.replace(
        /(return chunks\.map\(\(chunk\) => \{[\s\S]*?let html = renderTelegramHtml\(chunk\);)(\s+return \{)/,
        `$1
        html = html.replace(/\\n\\n(<b>)/g, '\\n⠀\\n$1');
$2`
    );
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Патч применен успешно');
NODE_PATCH "$FILE_PATH"

if [ $? -eq 0 ]; then
    echo "✅ Патч применен"
else
    echo "❌ Ошибка при применении патча, восстанавливаю из резервной копии..."
    cp "${FILE_PATH}.bak" "$FILE_PATH"
    exit 1
fi
