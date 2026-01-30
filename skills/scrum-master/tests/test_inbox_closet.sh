#!/usr/bin/env bash
# test_inbox_closet.sh - Test inbox and closet functionality

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_DIR="$(dirname "$SCRIPT_DIR")"

# Use temp data dir for tests
export SCRUM_DATA_DIR="/tmp/scrum-test-$$"
mkdir -p "$SCRUM_DATA_DIR"

cleanup() {
  rm -rf "$SCRUM_DATA_DIR"
}
trap cleanup EXIT

echo "🧪 Testing inbox & closet functionality..."
echo

# Test 1: Add to inbox
echo "Test 1: Add to inbox"
RESULT=$(bash "$SKILLS_DIR/scripts/inbox.sh" add "Test idea 1")
echo "✓ Added: $RESULT"

# Test 2: List inbox
echo
echo "Test 2: List inbox"
LIST=$(bash "$SKILLS_DIR/scripts/inbox.sh" list)
COUNT=$(echo "$LIST" | jq -r '.count')
if [[ "$COUNT" == "1" ]]; then
  echo "✓ Inbox count: $COUNT"
else
  echo "✗ Expected count 1, got $COUNT"
  exit 1
fi

# Test 3: Add with note
echo
echo "Test 3: Add with note"
RESULT=$(bash "$SKILLS_DIR/scripts/inbox.sh" add-note "Main text" "Reply context")
ITEM_ID=$(echo "$RESULT" | jq -r '.id')
echo "✓ Added with note: $ITEM_ID"

# Test 4: Get specific item
echo
echo "Test 4: Get specific item"
ITEM=$(bash "$SKILLS_DIR/scripts/inbox.sh" get "$ITEM_ID")
NOTE=$(echo "$ITEM" | jq -r '.note')
if [[ "$NOTE" == "Reply context" ]]; then
  echo "✓ Note preserved: $NOTE"
else
  echo "✗ Expected 'Reply context', got '$NOTE'"
  exit 1
fi

# Test 5: Move to closet
echo
echo "Test 5: Move to closet"
TEXT=$(echo "$ITEM" | jq -r '.text')
NOTE=$(echo "$ITEM" | jq -r '.note')
CLOSET_RESULT=$(bash "$SKILLS_DIR/scripts/closet.sh" add "$TEXT" "$NOTE" "inbox" "$ITEM_ID")
CLOSET_ID=$(echo "$CLOSET_RESULT" | jq -r '.id')
echo "✓ Closeted: $CLOSET_ID"

# Test 6: List closet
echo
echo "Test 6: List closet"
CLOSET_LIST=$(bash "$SKILLS_DIR/scripts/closet.sh" list)
CLOSET_COUNT=$(echo "$CLOSET_LIST" | jq -r '.count')
if [[ "$CLOSET_COUNT" == "1" ]]; then
  echo "✓ Closet count: $CLOSET_COUNT"
else
  echo "✗ Expected count 1, got $CLOSET_COUNT"
  exit 1
fi

# Test 7: Remove from inbox after closeting
echo
echo "Test 7: Remove from inbox"
bash "$SKILLS_DIR/scripts/inbox.sh" remove "$ITEM_ID" >/dev/null
LIST=$(bash "$SKILLS_DIR/scripts/inbox.sh" list)
COUNT=$(echo "$LIST" | jq -r '.count')
if [[ "$COUNT" == "1" ]]; then
  echo "✓ Inbox after removal: $COUNT items"
else
  echo "✗ Expected 1 item, got $COUNT"
  exit 1
fi

# Test 8: Uncloset back to inbox
echo
echo "Test 8: Uncloset back to inbox"
bash "$SKILLS_DIR/scripts/uncloset.sh" "$CLOSET_ID" >/dev/null
LIST=$(bash "$SKILLS_DIR/scripts/inbox.sh" list)
COUNT=$(echo "$LIST" | jq -r '.count')
if [[ "$COUNT" == "2" ]]; then
  echo "✓ Inbox after uncloset: $COUNT items"
else
  echo "✗ Expected 2 items, got $COUNT"
  exit 1
fi

echo
echo "✅ All tests passed!"
