#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

require_cmds jq date

ACTION="${1:-list}"
TASK_ID="${2:-}"
REASON="${3:-}"

ensure_data_dir
DATA_FILE="$(get_data_file "blocked.json")"

if [ ! -f "$DATA_FILE" ]; then
    echo '{"blocked": []}' > "$DATA_FILE"
fi

case "$ACTION" in
    list)
        jq '.blocked' "$DATA_FILE"
        ;;
    
    add)
        if [ -z "$TASK_ID" ]; then
            fail "Usage: $0 add <task_id> [reason]"
        fi
        
        TIMESTAMP="$(date -Iseconds)"
        REASON_VAL="${REASON:-No reason specified}"
        jq --arg id "$TASK_ID" \
           --arg reason "$REASON_VAL" \
           --arg ts "$TIMESTAMP" \
           '.blocked = ([.blocked[] | select(.task_id != $id)] + [{"task_id": $id, "reason": $reason, "blocked_at": $ts}])' \
           "$DATA_FILE" > "${DATA_FILE}.tmp" && mv "${DATA_FILE}.tmp" "$DATA_FILE"

        jq -n --arg task_id "$TASK_ID" --arg reason "$REASON_VAL" '{status: "blocked", task_id: $task_id, reason: $reason}'
        ;;
    
    remove)
        if [ -z "$TASK_ID" ]; then
            fail "Usage: $0 remove <task_id>"
        fi
        
        jq --arg id "$TASK_ID" '.blocked = [.blocked[] | select(.task_id != $id)]' \
           "$DATA_FILE" > "${DATA_FILE}.tmp" && mv "${DATA_FILE}.tmp" "$DATA_FILE"

        jq -n --arg task_id "$TASK_ID" '{status: "unblocked", task_id: $task_id}'
        ;;
    
    *)
        fail "Unknown action: $ACTION. Use: list, add, remove"
        ;;
esac
