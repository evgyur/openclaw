#!/usr/bin/env bash
# closet.sh - Manage closet items (permanent storage without guilt)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

ACTION="${1:-list}"
shift || true

CLOSET_FILE="$(get_data_file closet.json)"

# Initialize closet if it doesn't exist
init_closet() {
  if [[ ! -f "$CLOSET_FILE" ]]; then
    echo '{"items":[]}' > "$CLOSET_FILE"
  fi
}

# List closet items
list_closet() {
  init_closet
  local items
  items=$(jq -r '.items[] | "[\(.id)] \(.text)\(.note // "" | if . != "" then " — \(.)" else "" end)"' "$CLOSET_FILE" 2>/dev/null || echo "")
  
  if [[ -z "$items" ]]; then
    echo '{"count":0,"items":[]}'
  else
    jq '{count:(.items|length),items:.items}' "$CLOSET_FILE"
  fi
}

# Add item to closet
add_closet() {
  local text="$1"
  local note="${2:-}"
  local source="${3:-manual}"
  local original_id="${4:-}"
  
  init_closet
  
  local id
  local timestamp
  id="closet-$(date +%s)-$(head -c 3 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 3)"
  timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  
  local new_item
  if [[ -n "$note" ]]; then
    new_item=$(jq -n \
      --arg id "$id" \
      --arg text "$text" \
      --arg note "$note" \
      --arg src "$source" \
      --arg orig "$original_id" \
      --arg ts "$timestamp" \
      '{id:$id,text:$text,source:$src,created_at:$ts,note:$note,original_id:$orig}')
  else
    new_item=$(jq -n \
      --arg id "$id" \
      --arg text "$text" \
      --arg src "$source" \
      --arg orig "$original_id" \
      --arg ts "$timestamp" \
      '{id:$id,text:$text,source:$src,created_at:$ts,note:null,original_id:$orig}')
  fi
  
  jq --argjson item "$new_item" '.items += [$item]' "$CLOSET_FILE" > "${CLOSET_FILE}.tmp"
  mv "${CLOSET_FILE}.tmp" "$CLOSET_FILE"
  
  echo "{\"status\":\"closeted\",\"id\":\"$id\",\"text\":\"$text\"}"
}

# Remove from closet
remove_closet() {
  local id="$1"
  
  init_closet
  
  local removed
  removed=$(jq --arg id "$id" '.items[] | select(.id == $id)' "$CLOSET_FILE")
  
  if [[ -z "$removed" ]]; then
    fail "Item $id not found in closet"
  fi
  
  jq --arg id "$id" '.items |= map(select(.id != $id))' "$CLOSET_FILE" > "${CLOSET_FILE}.tmp"
  mv "${CLOSET_FILE}.tmp" "$CLOSET_FILE"
  
  echo "{\"status\":\"removed\",\"id\":\"$id\"}"
}

# Get specific item
get_item() {
  local id="$1"
  
  init_closet
  
  jq --arg id "$id" '.items[] | select(.id == $id)' "$CLOSET_FILE"
}

case "$ACTION" in
  list)
    list_closet
    ;;
  add)
    if [[ $# -lt 1 ]]; then
      fail "Usage: closet.sh add <text> [note] [source] [original_id]"
    fi
    add_closet "$@"
    ;;
  remove)
    if [[ $# -lt 1 ]]; then
      fail "Usage: closet.sh remove <id>"
    fi
    remove_closet "$1"
    ;;
  get)
    if [[ $# -lt 1 ]]; then
      fail "Usage: closet.sh get <id>"
    fi
    get_item "$1"
    ;;
  *)
    fail "Unknown action: $ACTION"
    ;;
esac
