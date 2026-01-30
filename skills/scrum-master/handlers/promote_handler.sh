#!/usr/bin/env bash
# promote_handler.sh - Telegram-facing promote handler

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_DIR="$(dirname "$SCRIPT_DIR")"

# Source lib
# shellcheck source=../scripts/lib.sh
source "$SKILLS_DIR/scripts/lib.sh"

INBOX_ID="$1"
DUE_DATE="${2:-}"

if [[ -z "$INBOX_ID" ]]; then
  echo "❌ Использование: /promote <inbox-id> [due-date]"
  exit 1
fi

# Promote
RESULT=$(bash "$SKILLS_DIR/scripts/promote.sh" "$INBOX_ID" "$DUE_DATE" 2>&1)

if echo "$RESULT" | grep -q "not found"; then
  echo "❌ Inbox item $INBOX_ID не найден"
  exit 1
fi

TASK_TITLE=$(echo "$RESULT" | jq -r '.task_title')

echo "✅ **Promoted → Google Tasks:**"
echo "⠀"
echo "$TASK_TITLE"
if [[ -n "$DUE_DATE" ]]; then
  echo "⠀"
  echo "📅 Due: $DUE_DATE"
fi
