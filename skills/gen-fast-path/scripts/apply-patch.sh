#!/bin/bash
# Apply gen-fast-path patch to Clawdbot

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
CACHE_DIR="$HOME/.clawdbot/extensions/gen-fast-path"
BOT_HANDLERS="$HOME/.nvm/versions/node/v22.22.0/lib/node_modules/clawdbot/dist/telegram/bot-handlers.js"

echo "🚀 Applying gen-fast-path patch..."
echo ""

# Check if already patched
if grep -q "GEN FAST PATH" "$BOT_HANDLERS" 2>/dev/null; then
    echo "⚠️  Patch already applied!"
    echo ""
    read -p "Re-apply? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
    
    # Restore from backup
    if [ -f "$BOT_HANDLERS.backup" ]; then
        echo "📦 Restoring from backup..."
        cp "$BOT_HANDLERS.backup" "$BOT_HANDLERS"
    fi
fi

# Create backup
echo "📦 Creating backup..."
cp "$BOT_HANDLERS" "$BOT_HANDLERS.backup"
echo "   Saved: $BOT_HANDLERS.backup"
echo ""

# Create cache directory
echo "📁 Creating cache directory..."
mkdir -p "$CACHE_DIR"
cp "$SKILL_DIR/cache/gen-cache.json" "$CACHE_DIR/gen-cache.json"
echo "   Created: $CACHE_DIR"
echo ""

# Apply patch manually (since .patch file might fail due to line numbers)
echo "🔧 Applying patch..."

# Step 1: Add import
sed -i '2 a import { readFileSync } from "fs";' "$BOT_HANDLERS"

# Step 2: Add fast path functions after registerTelegramHandlers line
# This is complex, so we'll use a temp file
TEMP_FILE=$(mktemp)

cat > "$TEMP_FILE" << 'FASTPATH'
    // === GEN FAST PATH ===
    let genCache = {};
    try {
        const cachePath = process.env.HOME + '/clawd/.clawdbot/extensions/gen-fast-path/gen-cache.json';
        genCache = JSON.parse(readFileSync(cachePath, 'utf-8'));
    } catch (err) {
        // Cache not available, fast path disabled
    }
    
    function isGenCommand(text) {
        if (!text) return false;
        return text === '/gen' ||
               text.startsWith('category:') ||
               text.startsWith('model:') ||
               text.startsWith('back:');
    }
    
    async function sendGenResponse(chatId, text) {
        const cached = genCache[text];
        if (!cached) return false;
        
        const url = `https://api.telegram.org/bot${opts.token}/sendMessage`;
        const payload = {
            chat_id: chatId,
            text: cached.message,
            parse_mode: 'Markdown'
        };
        
        if (cached.buttons && cached.buttons.length > 0) {
            payload.reply_markup = {
                inline_keyboard: cached.buttons
            };
        }
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            return response.ok;
        } catch (err) {
            return false;
        }
    }
    // === END GEN FAST PATH ===
FASTPATH

# Insert after line containing "registerTelegramHandlers = ({ cfg"
awk -v insert="$TEMP_FILE" '/registerTelegramHandlers = \({ cfg/ {print; system("cat " insert); next}1' "$BOT_HANDLERS" > "$BOT_HANDLERS.tmp"
mv "$BOT_HANDLERS.tmp" "$BOT_HANDLERS"
rm "$TEMP_FILE"

# Step 3: Add fast path check in callback_query handler
# Find the line with "await bot.api.answerCallbackQuery" and add fast path after it
sed -i '/await bot.api.answerCallbackQuery.*catch/a \        \n        // === GEN FAST PATH ===\n        const data = (callback.data ?? "").trim();\n        const chatId = callback.message?.chat?.id;\n        if (data && chatId && isGenCommand(data)) {\n            const sent = await sendGenResponse(chatId, data);\n            if (sent) return; // Fast path handled it\n        }\n        // === END GEN FAST PATH ===\n' "$BOT_HANDLERS"

# Step 4: Remove duplicate "const data =" line that now exists in try block
# (We moved it outside, so remove the one inside try)
sed -i '/^            const data = (callback.data/d' "$BOT_HANDLERS"

echo "✅ Patch applied!"
echo ""

# Verify
echo "🔍 Verifying patch..."
if grep -q "GEN FAST PATH" "$BOT_HANDLERS"; then
    echo "✅ Fast path code found"
else
    echo "❌ Fast path code NOT found!"
    exit 1
fi

if [ -f "$CACHE_DIR/gen-cache.json" ]; then
    CACHE_COUNT=$(jq 'keys | length' "$CACHE_DIR/gen-cache.json")
    echo "✅ Cache ready ($CACHE_COUNT commands)"
else
    echo "❌ Cache file missing!"
    exit 1
fi

echo ""
echo "🔄 Restarting Clawdbot..."
systemctl --user restart clawdbot-gateway || pkill -f clawdbot-gateway

echo ""
echo "✅ Gen fast path installed successfully!"
echo ""
echo "Test: Send /gen in Telegram"
echo "Expected: Buttons arrive in <500ms"
echo ""
echo "Rollback: bash $SCRIPT_DIR/rollback.sh"
