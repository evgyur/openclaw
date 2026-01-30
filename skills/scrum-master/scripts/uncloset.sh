#!/usr/bin/env bash
# uncloset.sh - Retrieve item from closet back to inbox

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

if [[ $# -lt 1 ]]; then
  fail "Usage: uncloset.sh <closet-id>"
fi

CLOSET_ID="$1"

CLOSET_FILE="$(get_data_file closet.json)"

# Get closet item
ITEM=$(jq --arg id "$CLOSET_ID" '.items[] | select(.id == $id)' "$CLOSET_FILE" 2>/dev/null)

if [[ -z "$ITEM" ]]; then
  fail "Closet item $CLOSET_ID not found"
fi

# Extract data
TEXT=$(echo "$ITEM" | jq -r '.text')
NOTE=$(echo "$ITEM" | jq -r '.note // ""')

# Add back to inbox
if [[ -n "$NOTE" ]]; then
  bash "$SCRIPT_DIR/inbox.sh" add-note "$TEXT" "$NOTE" >/dev/null
else
  bash "$SCRIPT_DIR/inbox.sh" add "$TEXT" >/dev/null
fi

# Remove from closet
bash "$SCRIPT_DIR/closet.sh" remove "$CLOSET_ID" >/dev/null

echo "{\"status\":\"uncloseted\",\"closet_id\":\"$CLOSET_ID\",\"text\":\"$TEXT\"}"
