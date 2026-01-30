#!/usr/bin/env bash
# promote.sh - Promote inbox item to active Google Task

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

if [[ $# -lt 1 ]]; then
  fail "Usage: promote.sh <inbox-id> [due-date]"
fi

INBOX_ID="$1"
DUE_DATE="${2:-}"

INBOX_FILE="$(get_data_file inbox.json)"

# Get inbox item
ITEM=$(jq --arg id "$INBOX_ID" '.items[] | select(.id == $id)' "$INBOX_FILE" 2>/dev/null)

if [[ -z "$ITEM" ]]; then
  fail "Inbox item $INBOX_ID not found"
fi

# Extract text and note
TEXT=$(echo "$ITEM" | jq -r '.text')
NOTE=$(echo "$ITEM" | jq -r '.note // ""')

# Build task title
TASK_TITLE="$TEXT"

# Build task notes
TASK_NOTES=""
if [[ -n "$NOTE" ]]; then
  TASK_NOTES="Context: $NOTE"
fi

# Get list ID
LIST_ID=$(get_list_id)

# Create Google Task
if [[ -n "$DUE_DATE" ]]; then
  if [[ -n "$TASK_NOTES" ]]; then
    run_gog tasks add "$LIST_ID" --title "$TASK_TITLE" --notes "$TASK_NOTES" --due "$DUE_DATE" --json
  else
    run_gog tasks add "$LIST_ID" --title "$TASK_TITLE" --due "$DUE_DATE" --json
  fi
else
  if [[ -n "$TASK_NOTES" ]]; then
    run_gog tasks add "$LIST_ID" --title "$TASK_TITLE" --notes "$TASK_NOTES" --json
  else
    run_gog tasks add "$LIST_ID" --title "$TASK_TITLE" --json
  fi
fi

# Remove from inbox
bash "$SCRIPT_DIR/inbox.sh" remove "$INBOX_ID" >/dev/null

echo "{\"status\":\"promoted\",\"inbox_id\":\"$INBOX_ID\",\"task_title\":\"$TASK_TITLE\"}"
