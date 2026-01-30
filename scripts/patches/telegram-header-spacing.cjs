#!/usr/bin/env node
/**
 * Patch: Telegram Header Spacing
 *
 * Улучшает fixTelegramSpacing для обработки заголовков:
 * - Вставляет ⠀ перед <b> если там просто \n
 * - Вставляет ⠀ после </b> если за ним идёт текст без разделителя
 *
 * Usage: node telegram-header-spacing.js [path/to/format.js]
 */

const fs = require('fs');
const path = require('path');

const filePath = process.argv[2] || process.env.CLAWDBOT_FORMAT;

if (!filePath) {
    // Try to find format.js
    const possiblePaths = [
        path.join(process.env.HOME, 'clawdbot/dist/telegram/format.js'),
        // Add more paths if needed
    ];

    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            applyPatch(p);
            process.exit(0);
        }
    }

    console.error('❌ format.js not found. Pass path as argument.');
    process.exit(1);
} else {
    applyPatch(filePath);
}

function applyPatch(file) {
    console.log(`📝 Patching: ${file}`);

    let content = fs.readFileSync(file, 'utf8');

    // Check if already patched
    if (content.includes('// Patch: Header spacing')) {
        console.log('✅ Already patched');
        return;
    }

    // Backup
    fs.copyFileSync(file, file + '.bak-header-' + Date.now());

    // Find and replace fixTelegramSpacing function
    const oldFunction = `function fixTelegramSpacing(html) {
    // Replace \\n\\n with \\n⠀\\n (U+2800 braille blank)
    // Telegram removes empty lines before headers, so we use braille separator
    let fixed = html.replace(/\\n\\n+/g, '\\n⠀\\n');
    // Clean up edge cases
    fixed = fixed.replace(/^⠀\\n/, ''); // Remove leading ⠀
    fixed = fixed.replace(/\\n⠀$/g, ''); // Remove trailing ⠀
    fixed = fixed.replace(/⠀\\n⠀\\n/g, '⠀\\n'); // Remove duplicate ⠀
    return fixed;
}`;

    const newFunction = `function fixTelegramSpacing(html) {
    // Patch: Header spacing (v2026.1.30)
    // Replace \\n\\n with \\n⠀\\n (U+2800 braille blank)
    // Telegram removes empty lines before headers, so we use braille separator
    let fixed = html.replace(/\\n\\n+/g, '\\n⠀\\n');

    // NEW: Add spacing around bold headers (lines starting with <b>)
    // Before <b>: ensure ⠀ separator if just \\n
    fixed = fixed.replace(/([^⠀\\n])\\n(<b>)/g, '$1\\n⠀\\n$2');

    // After </b>: ensure ⠀ separator before next content line
    // But not if followed by another tag or already has separator
    fixed = fixed.replace(/(<\\/b>)\\n([^⠀<\\n•\\-\\d])/g, '$1\\n⠀\\n$2');

    // Clean up edge cases
    fixed = fixed.replace(/^⠀\\n/, ''); // Remove leading ⠀
    fixed = fixed.replace(/\\n⠀$/g, ''); // Remove trailing ⠀
    fixed = fixed.replace(/⠀\\n⠀\\n/g, '⠀\\n'); // Remove duplicate ⠀
    fixed = fixed.replace(/\\n⠀\\n⠀\\n/g, '\\n⠀\\n'); // Remove triple ⠀
    return fixed;
}`;

    if (!content.includes(oldFunction)) {
        console.log('⚠️ Function signature changed, trying flexible match...');

        // Try regex match
        const regex = /function fixTelegramSpacing\(html\) \{[\s\S]*?return fixed;\s*\}/;
        if (regex.test(content)) {
            content = content.replace(regex, newFunction);
            fs.writeFileSync(file, content, 'utf8');
            console.log('✅ Patched (flexible match)');
        } else {
            console.log('❌ Could not find function to patch');
            process.exit(1);
        }
    } else {
        content = content.replace(oldFunction, newFunction);
        fs.writeFileSync(file, content, 'utf8');
        console.log('✅ Patched successfully');
    }
}
