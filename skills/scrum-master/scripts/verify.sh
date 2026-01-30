#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

require_cmds jq gog date

ACCOUNT="${GOG_ACCOUNT:-}"

LISTS_JSON="$(get_lists_json "$ACCOUNT")"
LIST_ID="$(get_list_id "$LISTS_JSON")"
TASKS_RAW="$(fetch_tasks "$LIST_ID" "$ACCOUNT")"
TASKS="$(echo "$TASKS_RAW" | normalize_tasks)"
COUNT="$(echo "$TASKS" | jq 'length')"

jq -n \
  --arg list_id "$LIST_ID" \
  --argjson task_count "$COUNT" \
  --arg data_dir "$SCRUM_DATA_DIR" \
  '{status: "ok", list_id: $list_id, task_count: $task_count, data_dir: $data_dir}'
