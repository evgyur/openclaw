#!/bin/bash
# Update gen-cache.json when chip-fai models change

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
CACHE_FILE="$SKILL_DIR/cache/gen-cache.json"
ROUTER_SCRIPT="$HOME/clawd/skills/chip-fai/scripts/router.py"
PARSE_MODELS="$HOME/clawd/skills/chip-fai/scripts/parse_models.py"

echo "🔄 Updating gen-fast-path cache..."
echo ""

# Get all model IDs
echo "📊 Fetching models from chip-fai..."
MODELS=$(python3 "$PARSE_MODELS" 2>&1 | jq -r '.models | keys[]')

if [ -z "$MODELS" ]; then
    echo "❌ No models found!"
    exit 1
fi

MODEL_COUNT=$(echo "$MODELS" | wc -l)
echo "   Found $MODEL_COUNT models"
echo ""

# Start building new cache
TEMP_CACHE=$(mktemp)

cat > "$TEMP_CACHE" << 'EOF'
{
  "/gen": {
    "message": "🎨 **AI Image Generation**\n\nChoose a category:",
    "buttons": [
      [
        {"text": "🎨 Create (Text→Image)", "callback_data": "category:create"},
        {"text": "✏️ Edit (Image→Image)", "callback_data": "category:edit"}
      ],
      [
        {"text": "✨ Enhance (Quality)", "callback_data": "category:enhance"}
      ]
    ]
  },
EOF

# Get category responses
echo "📦 Generating category caches..."
for category in create edit enhance; do
    echo "   category:$category"
    RESPONSE=$(python3 "$ROUTER_SCRIPT" --session temp --text "category:$category" 2>&1)
    echo "  \"category:$category\": $(echo "$RESPONSE" | jq -c '{message, buttons}')," >> "$TEMP_CACHE"
done

# Get back:category
echo "  \"back:category\": {" >> "$TEMP_CACHE"
echo "    \"message\": \"🎨 **AI Image Generation**\n\nChoose a category:\"," >> "$TEMP_CACHE"
echo "    \"buttons\": [" >> "$TEMP_CACHE"
echo "      [{\"text\": \"🎨 Create (Text→Image)\", \"callback_data\": \"category:create\"},{\"text\": \"✏️ Edit (Image→Image)\", \"callback_data\": \"category:edit\"}]," >> "$TEMP_CACHE"
echo "      [{\"text\": \"✨ Enhance (Quality)\", \"callback_data\": \"category:enhance\"}]" >> "$TEMP_CACHE"
echo "    ]" >> "$TEMP_CACHE"
echo "  }," >> "$TEMP_CACHE"

# Get model responses
echo "🎨 Generating model caches..."
COUNT=0
for model in $MODELS; do
    COUNT=$((COUNT + 1))
    echo "   [$COUNT/$MODEL_COUNT] model:$model"
    RESPONSE=$(python3 "$ROUTER_SCRIPT" --session temp --text "model:$model" 2>&1)
    
    # Check if last model (no trailing comma)
    if [ $COUNT -eq $MODEL_COUNT ]; then
        echo "  \"model:$model\": $(echo "$RESPONSE" | jq -c '{message, buttons}')" >> "$TEMP_CACHE"
    else
        echo "  \"model:$model\": $(echo "$RESPONSE" | jq -c '{message, buttons}')," >> "$TEMP_CACHE"
    fi
done

# Close JSON
echo "}" >> "$TEMP_CACHE"

# Validate JSON
if jq empty "$TEMP_CACHE" 2>/dev/null; then
    echo ""
    echo "✅ Cache generated successfully!"
    
    # Show diff
    if [ -f "$CACHE_FILE" ]; then
        OLD_COUNT=$(jq 'keys | length' "$CACHE_FILE")
        NEW_COUNT=$(jq 'keys | length' "$TEMP_CACHE")
        echo ""
        echo "📊 Changes:"
        echo "   Old cache: $OLD_COUNT commands"
        echo "   New cache: $NEW_COUNT commands"
        echo "   Diff: $((NEW_COUNT - OLD_COUNT))"
    fi
    
    # Replace cache
    mv "$TEMP_CACHE" "$CACHE_FILE"
    
    # Copy to deployment location
    if [ -d "$HOME/.clawdbot/extensions/gen-fast-path" ]; then
        cp "$CACHE_FILE" "$HOME/.clawdbot/extensions/gen-fast-path/gen-cache.json"
        echo "   Updated: ~/.clawdbot/extensions/gen-fast-path/gen-cache.json"
    fi
    
    echo ""
    echo "✅ Cache updated!"
    echo ""
    echo "Next steps:"
    echo "  1. Review changes: cat $CACHE_FILE | jq keys"
    echo "  2. Restart Clawdbot: systemctl --user restart clawdbot-gateway"
    
else
    echo ""
    echo "❌ Generated cache is invalid JSON!"
    cat "$TEMP_CACHE"
    rm "$TEMP_CACHE"
    exit 1
fi
