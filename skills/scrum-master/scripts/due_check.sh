#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

require_cmds jq gog date

TODAY="$(date +%Y-%m-%d)"
TOMORROW="$(date -d "+1 day" +%Y-%m-%d)"
ACCOUNT="${GOG_ACCOUNT:-}"

LIST_ID="${1:-${LIST_ID:-}}"
if [ -z "$LIST_ID" ]; then
  LISTS_JSON="$(get_lists_json "$ACCOUNT")"
  LIST_ID="$(get_list_id "$LISTS_JSON")"
fi

TASKS_RAW="$(fetch_tasks "$LIST_ID" "$ACCOUNT")"
TASKS="$(echo "$TASKS_RAW" | normalize_tasks)"

DUE_TODAY="$(echo "$TASKS" | jq --arg today "$TODAY" '[.[] | select(.status == "needsAction" and .due != null and (.due | split("T")[0]) == $today)]')"

DUE_TOMORROW="$(echo "$TASKS" | jq --arg tomorrow "$TOMORROW" '[.[] | select(.status == "needsAction" and .due != null and (.due | split("T")[0]) == $tomorrow)]')"

OVERDUE="$(echo "$TASKS" | jq --arg today "$TODAY" '[.[] | select(.status == "needsAction" and .due != null and (.due | split("T")[0]) < $today)]')"

jq -n \
  --arg today "$TODAY" \
  --arg tomorrow "$TOMORROW" \
  --argjson due_today "$DUE_TODAY" \
  --argjson due_tomorrow "$DUE_TOMORROW" \
  --argjson overdue "$OVERDUE" \
  '{
    today: $today,
    tomorrow: $tomorrow,
    due_today: $due_today,
    due_today_count: ($due_today | length),
    due_tomorrow: $due_tomorrow,
    due_tomorrow_count: ($due_tomorrow | length),
    overdue: $overdue,
    overdue_count: ($overdue | length)
  }'
