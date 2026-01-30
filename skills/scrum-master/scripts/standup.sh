#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

require_cmds jq gog date

ACCOUNT="${1:-${GOG_ACCOUNT:-}}"
TODAY="$(date +%Y-%m-%d)"

ensure_data_dir

LISTS_JSON="$(get_lists_json "$ACCOUNT")"
LIST_ID="$(get_list_id "$LISTS_JSON")"

TASKS_RAW="$(fetch_tasks "$LIST_ID" "$ACCOUNT")"
TASKS="$(echo "$TASKS_RAW" | normalize_tasks)"

INCOMPLETE="$(echo "$TASKS" | jq '[.[] | select(.status != "completed")]')"

URGENT="$(echo "$INCOMPLETE" | jq --arg today "$TODAY" '[.[] | select(.due != null and (.due | split("T")[0]) <= $today)]')"

jq -n \
  --arg date "$TODAY" \
  --arg list_id "$LIST_ID" \
  --argjson tasks "$INCOMPLETE" \
  --argjson urgent "$URGENT" \
  '{
    date: $date,
    list_id: $list_id,
    total_incomplete: ($tasks | length),
    urgent_count: ($urgent | length),
    tasks: $tasks,
    urgent: $urgent
  }'
