const fs = require('fs');

const filePath = process.argv[2];

if (!filePath) {
    console.error('Usage: node patch-telegram-format-fixed.js <file-path>');
    process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

// Проверяем, есть ли уже патч
if (content.includes('Fix: Telegram removes empty lines')) {
    console.log('✅ Патч уже применен');
    process.exit(0);
}

// Патч для markdownToTelegramHtml - более точное регулярное выражение
const func1Match = content.match(/(export function markdownToTelegramHtml\(markdown\) \{[\s\S]*?)(const ir = markdownToIR\(markdown \?\? "", \{)/);
if (func1Match) {
    const before = func1Match[1];
    const after = func1Match[2];
    
    const patched = before + `    // Fix: Telegram removes empty lines before headers. Add U+2800 (⠀) before headers that follow empty lines.
    // Process markdown BEFORE rendering to catch all header patterns
    let processedMarkdown = markdown ?? "";
    // Replace empty line + markdown header patterns (##, ###, **bold**, etc.) with U+2800 + header
    // Pattern: \\n\\n followed by header markers
    processedMarkdown = processedMarkdown.replace(/\\n\\n(#{1,6}\\s+)/g, '\\n⠀\\n$1'); // Markdown headers ##
    processedMarkdown = processedMarkdown.replace(/\\n\\n(\\*\\*[^*])/g, '\\n⠀\\n$1'); // Bold **text (likely header)
    processedMarkdown = processedMarkdown.replace(/\\n\\n(\\*\\s+)/g, '\\n⠀\\n$1'); // List items that might be headers
    
    ` + after;
    
    content = content.replace(/(export function markdownToTelegramHtml\(markdown\) \{[\s\S]*?)(const ir = markdownToIR\(markdown \?\? "", \{)/, patched);
    
    // Заменяем markdown на processedMarkdown
    content = content.replace(
        /const ir = markdownToIR\(markdown \?\? "", \{/,
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
}

// Патч для markdownToTelegramChunks
const func2Match = content.match(/(export function markdownToTelegramChunks\(markdown, limit\) \{[\s\S]*?)(const ir = markdownToIR\(markdown \?\? "", \{)/);
if (func2Match) {
    const before = func2Match[1];
    const after = func2Match[2];
    
    const patched = before + `    // Apply same fix as markdownToTelegramHtml
    let processedMarkdown = markdown ?? "";
    processedMarkdown = processedMarkdown.replace(/\\n\\n(#{1,6}\\s+)/g, '\\n⠀\\n$1');
    processedMarkdown = processedMarkdown.replace(/\\n\\n(\\*\\*[^*])/g, '\\n⠀\\n$1');
    processedMarkdown = processedMarkdown.replace(/\\n\\n(\\*\\s+)/g, '\\n⠀\\n$1');
    
    ` + after;
    
    content = content.replace(/(export function markdownToTelegramChunks\(markdown, limit\) \{[\s\S]*?)(const ir = markdownToIR\(markdown \?\? "", \{)/, patched);
    
    // Заменяем markdown на processedMarkdown в chunks (только внутри функции chunks)
    const chunksFunc = content.match(/(export function markdownToTelegramChunks\(markdown, limit\) \{[\s\S]*?)(const ir = markdownToIR\(processedMarkdown, \{)/);
    if (!chunksFunc) {
        // Если еще не заменено, заменяем
        const chunksMatch = content.match(/(export function markdownToTelegramChunks\(markdown, limit\) \{[\s\S]*?)const ir = markdownToIR\(markdown \?\? "", \{/);
        if (chunksMatch) {
            content = content.replace(
                /(export function markdownToTelegramChunks\(markdown, limit\) \{[\s\S]*?)const ir = markdownToIR\(markdown \?\? "", \{/,
                '$1const ir = markdownToIR(processedMarkdown, {'
            );
        }
    }
    
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
