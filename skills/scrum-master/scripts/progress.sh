#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

require_cmds jq gog date

TODAY="$(date +%Y-%m-%d)"
ACCOUNT="${GOG_ACCOUNT:-}"

LIST_ID="${1:-${LIST_ID:-}}"
if [ -z "$LIST_ID" ]; then
  LISTS_JSON="$(get_lists_json "$ACCOUNT")"
  LIST_ID="$(get_list_id "$LISTS_JSON")"
fi

TASKS_RAW="$(fetch_tasks "$LIST_ID" "$ACCOUNT")"
TASKS="$(echo "$TASKS_RAW" | normalize_tasks)"

TOTAL="$(echo "$TASKS" | jq 'length')"
DONE="$(echo "$TASKS" | jq '[.[] | select(.status == "completed")] | length')"
PENDING="$(echo "$TASKS" | jq '[.[] | select(.status == "needsAction")] | length')"

OVERDUE="$(echo "$TASKS" | jq --arg today "$TODAY" '[.[] | select(.status == "needsAction" and .due != null and (.due | split("T")[0]) < $today)] | length')"

DUE_TODAY="$(echo "$TASKS" | jq --arg today "$TODAY" '[.[] | select(.status == "needsAction" and .due != null and (.due | split("T")[0]) == $today)] | length')"

if [ "$TOTAL" -gt 0 ]; then
  PERCENT=$((DONE * 100 / TOTAL))
else
  PERCENT=0
fi

jq -n \
  --arg date "$TODAY" \
  --arg list_id "$LIST_ID" \
  --argjson tasks "$TASKS" \
  --argjson total "$TOTAL" \
  --argjson done "$DONE" \
  --argjson pending "$PENDING" \
  --argjson overdue "$OVERDUE" \
  --argjson due_today "$DUE_TODAY" \
  --argjson percent_complete "$PERCENT" \
  '{
    date: $date,
    list_id: $list_id,
    total: $total,
    done: $done,
    pending: $pending,
    overdue: $overdue,
    due_today: $due_today,
    percent_complete: $percent_complete,
    tasks: $tasks
  }'
