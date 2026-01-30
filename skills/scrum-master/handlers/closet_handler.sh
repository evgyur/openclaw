#!/usr/bin/env bash
# closet_handler.sh - Telegram-facing closet handler

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
    # Show closet items
    RESULT=$(bash "$SKILLS_DIR/scripts/closet.sh" list)
    COUNT=$(echo "$RESULT" | jq -r '.count')
    
    if [[ "$COUNT" == "0" ]]; then
      echo "🗄️ Closet пуст"
    else
      echo "**🗄️ Closet ($COUNT items)**"
      echo "⠀"
      echo "$RESULT" | jq -r '.items[] | "[\(.id | split("-")[1])] \(.text)\(.note // "" | if . != "" then "\n   💬 \(.)" else "" end)"'
    fi
    ;;
    
  add)
    # Move inbox item to closet
    INBOX_ID="$1"
    
    if [[ -z "$INBOX_ID" ]]; then
      echo "❌ Использование: /closet <inbox-id>"
      exit 1
    fi
    
    # Get inbox item
    ITEM=$(bash "$SKILLS_DIR/scripts/inbox.sh" get "$INBOX_ID" 2>/dev/null || echo "")
    
    if [[ -z "$ITEM" ]]; then
      echo "❌ Inbox item $INBOX_ID не найден"
      exit 1
    fi
    
    TEXT=$(echo "$ITEM" | jq -r '.text')
    NOTE=$(echo "$ITEM" | jq -r '.note // ""')
    
    # Add to closet
    if [[ -n "$NOTE" ]]; then
      RESULT=$(bash "$SKILLS_DIR/scripts/closet.sh" add "$TEXT" "$NOTE" "inbox" "$INBOX_ID")
    else
      RESULT=$(bash "$SKILLS_DIR/scripts/closet.sh" add "$TEXT" "" "inbox" "$INBOX_ID")
    fi
    
    CLOSET_ID=$(echo "$RESULT" | jq -r '.id' | cut -d'-' -f2)
    
    # Remove from inbox
    bash "$SKILLS_DIR/scripts/inbox.sh" remove "$INBOX_ID" >/dev/null
    
    echo "🗄️ **Closeted:** [$CLOSET_ID]"
    echo "⠀"
    echo "$TEXT"
    ;;
    
  uncloset)
    # Move back to inbox
    CLOSET_ID="$1"
    
    if [[ -z "$CLOSET_ID" ]]; then
      echo "❌ Использование: /uncloset <closet-id>"
      exit 1
    fi
    
    RESULT=$(bash "$SKILLS_DIR/scripts/uncloset.sh" "$CLOSET_ID" 2>&1)
    
    if echo "$RESULT" | grep -q "not found"; then
      echo "❌ Closet item $CLOSET_ID не найден"
      exit 1
    fi
    
    TEXT=$(echo "$RESULT" | jq -r '.text')
    
    echo "💡 **Uncloseted → Inbox:**"
    echo "⠀"
    echo "$TEXT"
    ;;
    
  *)
    echo "❌ Unknown command: $COMMAND"
    exit 1
    ;;
esac
