#!/bin/bash
# Verify gen-fast-path installation

BOT_HANDLERS="$HOME/.nvm/versions/node/v22.22.0/lib/node_modules/clawdbot/dist/telegram/bot-handlers.js"
CACHE_FILE="$HOME/.clawdbot/extensions/gen-fast-path/gen-cache.json"

echo "🔍 Gen Fast Path Verification"
echo "=============================="
echo ""

# Check patch
echo "📝 Patch status:"
if grep -q "GEN FAST PATH" "$BOT_HANDLERS" 2>/dev/null; then
    echo "   ✅ Patch applied"
    
    # Check if isGenCommand includes model:
    if grep -A 5 "function isGenCommand" "$BOT_HANDLERS" | grep -q "model:"; then
        echo "   ✅ Model fast path enabled"
    else
        echo "   ⚠️  Model fast path NOT enabled"
        echo "      Add text.startsWith('model:') to isGenCommand()"
    fi
else
    echo "   ❌ Patch NOT applied"
    echo "      Run: bash scripts/apply-patch.sh"
fi

echo ""

# Check cache
echo "📦 Cache status:"
if [ -f "$CACHE_FILE" ]; then
    CACHE_COUNT=$(jq 'keys | length' "$CACHE_FILE" 2>/dev/null || echo "0")
    echo "   ✅ Cache found"
    echo "   📊 Commands: $CACHE_COUNT"
    
    if [ "$CACHE_COUNT" -lt 20 ]; then
        echo "   ⚠️  Cache seems incomplete (expected 20+)"
        echo "      Run: bash scripts/update-cache.sh"
    fi
else
    echo "   ❌ Cache NOT found"
    echo "      Expected: $CACHE_FILE"
fi

echo ""

# Check Clawdbot
echo "🤖 Clawdbot status:"
if systemctl --user is-active clawdbot-gateway &>/dev/null; then
    echo "   ✅ Running"
    PID=$(systemctl --user show -p MainPID --value clawdbot-gateway)
    UPTIME=$(ps -p "$PID" -o etime= 2>/dev/null | tr -d ' ' || echo "unknown")
    echo "   ⏱️  Uptime: $UPTIME"
elif pgrep -f "clawdbot-gateway" &>/dev/null; then
    echo "   ✅ Running (not via systemd)"
else
    echo "   ❌ NOT running"
    echo "      Start: systemctl --user start clawdbot-gateway"
fi

echo ""

# Check backup
echo "💾 Backup status:"
if [ -f "$BOT_HANDLERS.backup" ]; then
    BACKUP_DATE=$(stat -c %y "$BOT_HANDLERS.backup" 2>/dev/null | cut -d' ' -f1)
    echo "   ✅ Backup exists"
    echo "   📅 Date: $BACKUP_DATE"
else
    echo "   ⚠️  No backup found"
    echo "      Backup will be created when patch is applied"
fi

echo ""

# Test cache validity
echo "🧪 Cache validation:"
if [ -f "$CACHE_FILE" ]; then
    # Check if /gen exists
    if jq -e '."/gen"' "$CACHE_FILE" &>/dev/null; then
        echo "   ✅ /gen command cached"
    else
        echo "   ❌ /gen NOT in cache"
    fi
    
    # Check categories
    for cat in create edit enhance; do
        if jq -e ".\"category:$cat\"" "$CACHE_FILE" &>/dev/null; then
            echo "   ✅ category:$cat cached"
        else
            echo "   ❌ category:$cat NOT cached"
        fi
    done
    
    # Check if any models cached
    MODEL_COUNT=$(jq '[keys[] | select(startswith("model:"))] | length' "$CACHE_FILE" 2>/dev/null || echo "0")
    if [ "$MODEL_COUNT" -gt 0 ]; then
        echo "   ✅ $MODEL_COUNT models cached"
    else
        echo "   ❌ No models cached"
    fi
fi

echo ""
echo "=============================="

# Overall status
if grep -q "GEN FAST PATH" "$BOT_HANDLERS" 2>/dev/null && [ -f "$CACHE_FILE" ]; then
    echo "✅ Gen fast path is READY"
    echo ""
    echo "Test: Send /gen in Telegram"
    echo "Expected: Buttons in <500ms"
else
    echo "❌ Gen fast path NOT ready"
    echo ""
    echo "Run: bash scripts/apply-patch.sh"
fi
