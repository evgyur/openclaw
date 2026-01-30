#!/bin/bash
# Local smoke tests (no external API calls)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export SCRUM_DATA_DIR
SCRUM_DATA_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$SCRUM_DATA_DIR"
}
trap cleanup EXIT

echo "Testing blocked.sh..."
"$ROOT_DIR/scripts/blocked.sh" add task-1 "blocked reason" >/dev/null
BLOCKED_JSON="$("$ROOT_DIR/scripts/blocked.sh" list)"
COUNT="$(echo "$BLOCKED_JSON" | jq 'length')"
if [ "$COUNT" -ne 1 ]; then
  echo "FAIL: blocked add/list failed" >&2
  exit 1
fi

"$ROOT_DIR/scripts/blocked.sh" remove task-1 >/dev/null
BLOCKED_JSON="$("$ROOT_DIR/scripts/blocked.sh" list)"
COUNT="$(echo "$BLOCKED_JSON" | jq 'length')"
if [ "$COUNT" -ne 0 ]; then
  echo "FAIL: blocked remove failed" >&2
  exit 1
fi
echo "  blocked.sh: ok"

echo "Testing streaks.sh..."
"$ROOT_DIR/scripts/streaks.sh" complete >/dev/null
STATE="$("$ROOT_DIR/scripts/streaks.sh" check)"
CURRENT="$(echo "$STATE" | jq -r '.current_streak')"
TOTAL="$(echo "$STATE" | jq -r '.total_completed')"
if [ "$CURRENT" -lt 1 ] || [ "$TOTAL" -lt 1 ]; then
  echo "FAIL: streaks complete failed" >&2
  exit 1
fi

# Check that badges don't contain empty string
BADGES="$(echo "$STATE" | jq -r '.badges')"
if echo "$BADGES" | jq -e 'index("")' >/dev/null 2>&1; then
  echo "FAIL: badges contains empty string" >&2
  exit 1
fi
echo "  streaks.sh: ok"

echo "Testing timeblock.sh validation..."
if "$ROOT_DIR/scripts/timeblock.sh" "Test" "2026-01-01T10:00" "2026-01-01T09:00" 2>/dev/null; then
  echo "FAIL: timeblock should reject end < start" >&2
  exit 1
fi

if "$ROOT_DIR/scripts/timeblock.sh" "Test" "2026-01-01T10:00" "2026-01-01T11:00" 99 2>/dev/null; then
  echo "FAIL: timeblock should reject invalid color" >&2
  exit 1
fi
echo "  timeblock.sh validation: ok"

echo ""
echo "All tests passed ✓"
