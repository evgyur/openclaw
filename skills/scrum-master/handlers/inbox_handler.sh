#!/usr/bin/env bash
# inbox_handler.sh - Telegram-facing inbox handler

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_DIR="$(dirname "$SCRIPT_DIR")"

# Source lib
# shellcheck source=../scripts/lib.sh
source "$SKILLS_DIR/scripts/lib.sh"

COMMAND="$1"
shift || true

case "$COMMAND" in
  list)
    # Show inbox items
    RESULT=$(bash "$SKILLS_DIR/scripts/inbox.sh" list)
    COUNT=$(echo "$RESULT" | jq -r '.count')
    
    if [[ "$COUNT" == "0" ]]; then
      echo "📭 Inbox пуст"
    else
      echo "**💡 Inbox ($COUNT items)**"
      echo "⠀"
      echo "$RESULT" | jq -r '.items[] | "[\(.id | split("-")[1])] \(.text)\(.note // "" | if . != "" then "\n   💬 \(.)" else "" end)"'
    fi
    ;;
    
  add)
    # Add new item
    TEXT="$*"
    if [[ -z "$TEXT" ]]; then
      echo "❌ Использование: /inbox <текст>"
      exit 1
    fi
    
    RESULT=$(bash "$SKILLS_DIR/scripts/inbox.sh" add "$TEXT")
    SHORT_ID=$(echo "$RESULT" | jq -r '.id' | cut -d'-' -f2)
    
    LIST=$(bash "$SKILLS_DIR/scripts/inbox.sh" list)
    COUNT=$(echo "$LIST" | jq -r '.count')
    
    echo "💡 Добавлено в inbox [$SHORT_ID] ($COUNT items)"
    ;;
    
  add-reply)
    # Add from reply context
    ORIGINAL_TEXT="$1"
    NOTE="${2:-}"
    
    if [[ -z "$ORIGINAL_TEXT" ]]; then
      echo "❌ Не удалось получить текст сообщения"
      exit 1
    fi
    
    if [[ -n "$NOTE" ]]; then
      RESULT=$(bash "$SKILLS_DIR/scripts/inbox.sh" add-note "$ORIGINAL_TEXT" "$NOTE")
    else
      RESULT=$(bash "$SKILLS_DIR/scripts/inbox.sh" add "$ORIGINAL_TEXT")
    fi
    
    SHORT_ID=$(echo "$RESULT" | jq -r '.id' | cut -d'-' -f2)
    
    LIST=$(bash "$SKILLS_DIR/scripts/inbox.sh" list)
    COUNT=$(echo "$LIST" | jq -r '.count')
    
    # Truncate original text for display
    DISPLAY_TEXT="$ORIGINAL_TEXT"
    if [[ ${#DISPLAY_TEXT} -gt 60 ]]; then
      DISPLAY_TEXT="${DISPLAY_TEXT:0:60}..."
    fi
    
    echo "💡 **Inboxed:** [$SHORT_ID]"
    echo "⠀"
    echo "$DISPLAY_TEXT"
    if [[ -n "$NOTE" ]]; then
      echo "⠀"
      echo "💬 $NOTE"
    fi
    echo "⠀"
    echo "_Total: $COUNT items_"
    ;;
    
  *)
    echo "❌ Unknown command: $COMMAND"
    exit 1
    ;;
esac
