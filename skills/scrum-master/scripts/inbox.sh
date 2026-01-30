#!/usr/bin/env bash
# inbox.sh - Manage inbox items (brain dump storage)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

ACTION="${1:-list}"
shift || true

INBOX_FILE="$(get_data_file inbox.json)"

# Initialize inbox if it doesn't exist
init_inbox() {
  if [[ ! -f "$INBOX_FILE" ]]; then
    echo '{"items":[]}' > "$INBOX_FILE"
  fi
}

# List inbox items
list_inbox() {
  init_inbox
  local items
  items=$(jq -r '.items[] | "[\(.id)] \(.text)\(.note // "" | if . != "" then " — \(.)" else "" end)"' "$INBOX_FILE" 2>/dev/null || echo "")
  
  if [[ -z "$items" ]]; then
    echo '{"count":0,"items":[]}'
  else
    jq '{count:(.items|length),items:.items}' "$INBOX_FILE"
  fi
}

# Add inbox item
add_inbox() {
  local text="$*"
  
  if [[ -z "$text" ]]; then
    fail "Usage: inbox.sh add <text>"
  fi
  
  init_inbox
  
  local id
  local timestamp
  id="inbox-$(date +%s)-$(head -c 3 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 3)"
  timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  
  local new_item
  new_item=$(jq -n \
    --arg id "$id" \
    --arg text "$text" \
    --arg ts "$timestamp" \
    '{id:$id,text:$text,source:"manual",created_at:$ts,note:null}')
  
  jq --argjson item "$new_item" '.items += [$item]' "$INBOX_FILE" > "${INBOX_FILE}.tmp"
  mv "${INBOX_FILE}.tmp" "$INBOX_FILE"
  
  echo "{\"status\":\"added\",\"id\":\"$id\",\"text\":\"$text\"}"
}

# Add with note (for reply context)
add_with_note() {
  local text="$1"
  local note="$2"
  
  init_inbox
  
  local id
  local timestamp
  id="inbox-$(date +%s)-$(head -c 3 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 3)"
  timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  
  local new_item
  new_item=$(jq -n \
    --arg id "$id" \
    --arg text "$text" \
    --arg note "$note" \
    --arg ts "$timestamp" \
    '{id:$id,text:$text,source:"reply",created_at:$ts,note:$note}')
  
  jq --argjson item "$new_item" '.items += [$item]' "$INBOX_FILE" > "${INBOX_FILE}.tmp"
  mv "${INBOX_FILE}.tmp" "$INBOX_FILE"
  
  echo "{\"status\":\"added\",\"id\":\"$id\",\"text\":\"$text\",\"note\":\"$note\"}"
}

# Remove inbox item
remove_inbox() {
  local id="$1"
  
  init_inbox
  
  local removed
  removed=$(jq --arg id "$id" '.items[] | select(.id == $id)' "$INBOX_FILE")
  
  if [[ -z "$removed" ]]; then
    fail "Item $id not found in inbox"
  fi
  
  jq --arg id "$id" '.items |= map(select(.id != $id))' "$INBOX_FILE" > "${INBOX_FILE}.tmp"
  mv "${INBOX_FILE}.tmp" "$INBOX_FILE"
  
  echo "{\"status\":\"removed\",\"id\":\"$id\"}"
}

# Get specific item
get_item() {
  local id="$1"
  
  init_inbox
  
  jq --arg id "$id" '.items[] | select(.id == $id)' "$INBOX_FILE"
}

case "$ACTION" in
  list)
    list_inbox
    ;;
  add)
    add_inbox "$@"
    ;;
  add-note)
    if [[ $# -lt 2 ]]; then
      fail "Usage: inbox.sh add-note <text> <note>"
    fi
    add_with_note "$1" "$2"
    ;;
  remove)
    if [[ $# -lt 1 ]]; then
      fail "Usage: inbox.sh remove <id>"
    fi
    remove_inbox "$1"
    ;;
  get)
    if [[ $# -lt 1 ]]; then
      fail "Usage: inbox.sh get <id>"
    fi
    get_item "$1"
    ;;
  *)
    fail "Unknown action: $ACTION"
    ;;
esac
