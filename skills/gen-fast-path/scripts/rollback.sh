#!/bin/bash
# Rollback gen-fast-path patch

set -e

BOT_HANDLERS="$HOME/.nvm/versions/node/v22.22.0/lib/node_modules/clawdbot/dist/telegram/bot-handlers.js"
BACKUP="$BOT_HANDLERS.backup"

echo "🔙 Rolling back gen-fast-path..."
echo ""

if [ ! -f "$BACKUP" ]; then
    echo "❌ Backup not found: $BACKUP"
    echo ""
    echo "Cannot rollback without backup."
    echo "You may need to reinstall Clawdbot: npm install -g clawdbot@latest"
    exit 1
fi

echo "📦 Restoring from backup..."
cp "$BACKUP" "$BOT_HANDLERS"

echo "✅ Restored: $BOT_HANDLERS"
echo ""

# Verify patch is gone
if grep -q "GEN FAST PATH" "$BOT_HANDLERS"; then
    echo "⚠️  Warning: Fast path code still present!"
    echo "   Manual cleanup may be needed."
else
    echo "✅ Fast path code removed"
fi

echo ""
echo "🔄 Restarting Clawdbot..."
systemctl --user restart clawdbot-gateway || pkill -f clawdbot-gateway

echo ""
echo "✅ Rollback complete!"
echo ""
echo "Gen command will now use original slow path (5-8s response time)"
