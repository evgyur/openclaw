#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

require_cmds gog date

TITLE="${1:-}"
START="${2:-}"
END="${3:-}"
COLOR="${4:-9}"

if [ -z "$TITLE" ] || [ -z "$START" ] || [ -z "$END" ]; then
  cat << 'EOF'
Usage: timeblock.sh 'Task title' 'YYYY-MM-DDTHH:MM' 'YYYY-MM-DDTHH:MM' [color]

Colors:
  1=lavender   2=sage      3=grape     4=flamingo (P1/urgent)
  5=banana     6=tangerine 7=peacock   8=graphite
  9=blueberry  10=basil    11=tomato

Examples:
  timeblock.sh "Deep work: Project X" "2026-01-24T10:00" "2026-01-24T12:00"
  timeblock.sh "P1: Urgent task" "2026-01-24T14:00" "2026-01-24T15:00" 4
EOF
  exit 1
fi

if ! [[ "$COLOR" =~ ^[0-9]+$ ]] || [ "$COLOR" -lt 1 ] || [ "$COLOR" -gt 11 ]; then
  fail "Invalid color '$COLOR'. Must be 1-11."
fi

START_TZ="$(date -d "$START" '+%Y-%m-%dT%H:%M:%S%z')"
END_TZ="$(date -d "$END" '+%Y-%m-%dT%H:%M:%S%z')"

START_EPOCH="$(date -d "$START" +%s)"
END_EPOCH="$(date -d "$END" +%s)"

if [ "$END_EPOCH" -le "$START_EPOCH" ]; then
  fail "End time must be after start time. Got start=$START, end=$END"
fi

run_gog calendar create primary \
  --summary "🎯 $TITLE" \
  --from "$START_TZ" \
  --to "$END_TZ" \
  --event-color "$COLOR" \
  --json
