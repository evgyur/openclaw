const fs = require('fs');

const filePath = process.argv[2];

if (!filePath) {
    console.error('Usage: node patch-telegram-format.js <file-path>');
    process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

// Проверяем, есть ли уже патч
if (content.includes('Fix: Telegram removes empty lines')) {
    console.log('✅ Патч уже применен');
    process.exit(0);
}

// Патч для markdownToTelegramHtml
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

// Заменяем markdown на processedMarkdown в вызове markdownToIR
content = content.replace(
    /const ir = markdownToIR\(processedMarkdown, \{/,
    'const ir = markdownToIR(processedMarkdown, {'
);

// Добавляем обработку HTML после рендеринга
content = content.replace(
    /(let html = renderTelegramHtml\(ir\);)(\s+return html;)/,
    `$1
    // Also fix in HTML: empty line + <b> tag (rendered bold headers)
    html = html.replace(/\\n\\n(<b>)/g, '\\n⠀\\n$1');
$2`
);

// Патч для markdownToTelegramChunks
content = content.replace(
    /(export function markdownToTelegramChunks\(markdown, limit\) \{[\s\S]*?)(const ir = markdownToIR\(markdown \?\? "", \{)/,
    `$1    // Apply same fix as markdownToTelegramHtml
    let processedMarkdown = markdown ?? "";
    processedMarkdown = processedMarkdown.replace(/\\n\\n(#{1,6}\\s+)/g, '\\n⠀\\n$1');
    processedMarkdown = processedMarkdown.replace(/\\n\\n(\\*\\*[^*])/g, '\\n⠀\\n$1');
    processedMarkdown = processedMarkdown.replace(/\\n\\n(\\*\\s+)/g, '\\n⠀\\n$1');
    
    $2`
);

// Заменяем markdown на processedMarkdown в markdownToTelegramChunks
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

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Патч применен успешно');
