#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

require_cmds jq date

ACTION="${1:-check}"

ensure_data_dir
DATA_FILE="$(get_data_file "streaks.json")"

if [ ! -f "$DATA_FILE" ]; then
    cat > "$DATA_FILE" << 'EOF'
{
  "current_streak": 0,
  "longest_streak": 0,
  "total_completed": 0,
  "last_completion_date": null,
  "badges": [],
  "history": []
}
EOF
fi

TODAY="$(date +%Y-%m-%d)"
YESTERDAY="$(date -d "-1 day" +%Y-%m-%d)"

case "$ACTION" in
    check)
        cat "$DATA_FILE"
        ;;
    
    complete)
        CURRENT=$(jq -r '.current_streak' "$DATA_FILE")
        LONGEST=$(jq -r '.longest_streak' "$DATA_FILE")
        TOTAL=$(jq -r '.total_completed' "$DATA_FILE")
        LAST_DATE=$(jq -r '.last_completion_date' "$DATA_FILE")
        
        TOTAL=$((TOTAL + 1))

        if [ "$LAST_DATE" = "$TODAY" ]; then
            : # Same day, streak stays same
        elif [ "$LAST_DATE" = "$YESTERDAY" ]; then
            CURRENT=$((CURRENT + 1))
        else
            CURRENT=1
        fi

        if [ "$CURRENT" -gt "$LONGEST" ]; then
            LONGEST=$CURRENT
        fi

        BADGES_JSON="$(jq '.badges' "$DATA_FILE")"
        NEW_BADGES=()

        if [ "$CURRENT" -ge 7 ] && ! echo "$BADGES_JSON" | jq -e 'index("week_streak")' >/dev/null; then
            NEW_BADGES+=("week_streak")
        fi
        if [ "$CURRENT" -ge 30 ] && ! echo "$BADGES_JSON" | jq -e 'index("month_streak")' >/dev/null; then
            NEW_BADGES+=("month_streak")
        fi
        if [ "$TOTAL" -ge 100 ] && ! echo "$BADGES_JSON" | jq -e 'index("century")' >/dev/null; then
            NEW_BADGES+=("century")
        fi
        
        if [ ${#NEW_BADGES[@]} -eq 0 ]; then
            NEW_BADGES_JSON="[]"
        else
            NEW_BADGES_JSON="$(printf '%s\n' "${NEW_BADGES[@]}" | jq -R . | jq -s '.')"
        fi

        jq --arg today "$TODAY" \
           --argjson current "$CURRENT" \
           --argjson longest "$LONGEST" \
           --argjson total "$TOTAL" \
           --argjson new_badges "$NEW_BADGES_JSON" \
           '.last_completion_date = $today
            | .current_streak = $current
            | .longest_streak = $longest
            | .total_completed = $total
            | .badges = (.badges + $new_badges | unique)
            | .history += [{date: $today, total_completed: $total, current_streak: $current, new_badges: $new_badges}]' \
           "$DATA_FILE" > "${DATA_FILE}.tmp" && mv "${DATA_FILE}.tmp" "$DATA_FILE"

        jq -n \
          --argjson streak "$CURRENT" \
          --argjson longest "$LONGEST" \
          --argjson total "$TOTAL" \
          --argjson new_badges "$NEW_BADGES_JSON" \
          '{streak: $streak, longest: $longest, total: $total, new_badges: $new_badges}'
        ;;
    
    badges)
        BADGES="$(jq '.badges' "$DATA_FILE")"
        if [ "$(echo "$BADGES" | jq 'length')" -eq 0 ]; then
            echo "[]"
        else
            echo "$BADGES"
        fi
        ;;
    
    *)
        fail "Unknown action: $ACTION. Use: check, complete, badges"
        ;;
esac
