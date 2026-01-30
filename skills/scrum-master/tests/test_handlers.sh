#!/usr/bin/env bash
# test_handlers.sh - Test Telegram handlers

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_DIR="$(dirname "$SCRIPT_DIR")"

# Use temp data dir for tests
export SCRUM_DATA_DIR="/tmp/scrum-handlers-test-$$"
mkdir -p "$SCRUM_DATA_DIR"

cleanup() {
  rm -rf "$SCRUM_DATA_DIR"
}
trap cleanup EXIT

echo "🧪 Testing Telegram handlers..."
echo

# Test 1: inbox_handler add
echo "Test 1: inbox_handler add"
OUTPUT=$(bash "$SKILLS_DIR/handlers/inbox_handler.sh" add "Test idea from handler")
if echo "$OUTPUT" | grep -q "Добавлено в inbox"; then
  echo "✓ Add successful"
else
  echo "✗ Add failed: $OUTPUT"
  exit 1
fi

# Test 2: inbox_handler list
echo
echo "Test 2: inbox_handler list"
OUTPUT=$(bash "$SKILLS_DIR/handlers/inbox_handler.sh" list)
if echo "$OUTPUT" | grep -q "💡 Inbox"; then
  echo "✓ List displays correctly"
else
  echo "✗ List failed: $OUTPUT"
  exit 1
fi

# Test 3: inbox_handler add-reply
echo
echo "Test 3: inbox_handler add-reply"
OUTPUT=$(bash "$SKILLS_DIR/handlers/inbox_handler.sh" add-reply "Original message text" "Context note")
if echo "$OUTPUT" | grep -q "Inboxed"; then
  echo "✓ Reply context preserved"
else
  echo "✗ add-reply failed: $OUTPUT"
  exit 1
fi

# Extract inbox ID from last add
INBOX_ID=$(bash "$SKILLS_DIR/scripts/inbox.sh" list | jq -r '.items[-1].id')

# Test 4: closet_handler add
echo
echo "Test 4: closet_handler add (move inbox to closet)"
OUTPUT=$(bash "$SKILLS_DIR/handlers/closet_handler.sh" add "$INBOX_ID")
if echo "$OUTPUT" | grep -q "Closeted"; then
  echo "✓ Closet successful"
else
  echo "✗ Closet failed: $OUTPUT"
  exit 1
fi

# Test 5: closet_handler list
echo
echo "Test 5: closet_handler list"
OUTPUT=$(bash "$SKILLS_DIR/handlers/closet_handler.sh" list)
if echo "$OUTPUT" | grep -q "🗄️ Closet"; then
  echo "✓ Closet list displays correctly"
else
  echo "✗ Closet list failed: $OUTPUT"
  exit 1
fi

# Extract closet ID
CLOSET_ID=$(bash "$SKILLS_DIR/scripts/closet.sh" list | jq -r '.items[0].id')

# Test 6: closet_handler uncloset
echo
echo "Test 6: closet_handler uncloset"
OUTPUT=$(bash "$SKILLS_DIR/handlers/closet_handler.sh" uncloset "$CLOSET_ID")
if echo "$OUTPUT" | grep -q "Uncloseted"; then
  echo "✓ Uncloset successful"
else
  echo "✗ Uncloset failed: $OUTPUT"
  exit 1
fi

# Test 7: Empty inbox
echo
echo "Test 7: Empty inbox display"
# Clear inbox
bash "$SKILLS_DIR/scripts/inbox.sh" list | jq -r '.items[].id' | while read -r id; do
  bash "$SKILLS_DIR/scripts/inbox.sh" remove "$id" >/dev/null
done

OUTPUT=$(bash "$SKILLS_DIR/handlers/inbox_handler.sh" list)
if echo "$OUTPUT" | grep -q "Inbox пуст"; then
  echo "✓ Empty inbox handled correctly"
else
  echo "✗ Empty inbox failed: $OUTPUT"
  exit 1
fi

# Test 8: Empty closet
echo
echo "Test 8: Empty closet display"
OUTPUT=$(bash "$SKILLS_DIR/handlers/closet_handler.sh" list)
if echo "$OUTPUT" | grep -q "Closet пуст"; then
  echo "✓ Empty closet handled correctly"
else
  echo "✗ Empty closet failed: $OUTPUT"
  exit 1
fi

echo
echo "✅ All handler tests passed!"
