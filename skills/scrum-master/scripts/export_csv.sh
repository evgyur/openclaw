#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

require_cmds jq gog date

DAYS="${1:-7}"
LIST_ID="${2:-${LIST_ID:-}}"
ACCOUNT="${GOG_ACCOUNT:-}"

if ! [[ "$DAYS" =~ ^[0-9]+$ ]] || [ "$DAYS" -lt 0 ]; then
  fail "Days must be a non-negative integer, got: $DAYS"
fi

if [ -z "$LIST_ID" ]; then
  LISTS_JSON="$(get_lists_json "$ACCOUNT")"
  LIST_ID="$(get_list_id "$LISTS_JSON")"
fi

OUTPUT_DIR="$(get_exports_dir)"
FILENAME="tasks_export_$(date +%Y%m%d_%H%M%S).csv"
OUTPUT_FILE="$OUTPUT_DIR/$FILENAME"
SINCE="$(date -d "-$DAYS day" +%Y-%m-%d)"

if TASKS_RAW="$(run_gog_allow_fail tasks list "$LIST_ID" --json ${ACCOUNT:+--account "$ACCOUNT"} --show-completed)"; then
  :
else
  TASKS_RAW="$(fetch_tasks "$LIST_ID" "$ACCOUNT")"
fi

TASKS="$(echo "$TASKS_RAW" | normalize_tasks)"

echo "Title,Status,Due,Created,Updated,Notes" > "$OUTPUT_FILE"

FILTERED="$(echo "$TASKS" | jq --arg since "$SINCE" '[.[] | select((.updated // .created // "") as $d | ($d == "" or ($d | split("T")[0]) >= $since))]')"

echo "$FILTERED" | jq -r '.[] | [
  .title // "",
  .status // "",
  (.due // "" | if . != "" then split("T")[0] else "" end),
  (.created // "" | if . != "" then split("T")[0] else "" end),
  (.updated // "" | if . != "" then split("T")[0] else "" end),
  (.notes // "" | gsub("\n"; " ") | gsub(","; ";"))
] | @csv' >> "$OUTPUT_FILE"

ROWS="$(wc -l < "$OUTPUT_FILE" | tr -d ' ')"

jq -n \
  --arg file "$OUTPUT_FILE" \
  --argjson rows "$ROWS" \
  --argjson days "$DAYS" \
  --arg since "$SINCE" \
  '{file: $file, rows: $rows, days: $days, since: $since}'
