#!/bin/bash
# Health check for chip-fai skill

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"

EXIT_CODE=0

echo "=== chip-fai Health Check ==="

# Check 1: Python dependencies
echo -n "Python 3: "
if command -v python3 &>/dev/null; then
    echo "OK ($(python3 --version))"
else
    echo "FAIL"
    EXIT_CODE=1
fi

# Check 2: Required binaries
for cmd in jq curl base64; do
    echo -n "$cmd: "
    if command -v $cmd &>/dev/null; then
        echo "OK"
    else
        echo "FAIL"
        EXIT_CODE=1
    fi
done

# Check 3: Submodule
echo -n "Submodule: "
if [[ -f "$SKILL_DIR/repo/telegram-bot/bot.py" ]]; then
    echo "OK"
else
    echo "FAIL (run: git submodule update --init)"
    EXIT_CODE=1
fi

# Check 4: Configuration
echo -n "Config (.env): "
if [[ -f "$SKILL_DIR/.env" ]] || [[ -n "${CHIP_FAI_API_TOKEN:-}" ]]; then
    echo "OK"
else
    echo "WARN (using .env.example)"
fi

# Check 5: Directories
echo -n "Media dir: "
if [[ -d "$SKILL_DIR/media" ]]; then
    echo "OK"
else
    echo "CREATING"
    mkdir -p "$SKILL_DIR/media"
fi

echo -n "State dir: "
if [[ -d "$SKILL_DIR/state" ]]; then
    echo "OK"
else
    echo "CREATING"
    mkdir -p "$SKILL_DIR/state"
fi

# Check 6: Parse models
echo -n "Parse models: "
if python3 "$SCRIPT_DIR/parse_models.py" &>/dev/null; then
    MODEL_COUNT=$(python3 "$SCRIPT_DIR/parse_models.py" | jq -r '.models | length')
    echo "OK ($MODEL_COUNT models)"
else
    echo "FAIL"
    EXIT_CODE=1
fi

# Check 7: API token validity
echo -n "API token: "
if [[ -f "$SKILL_DIR/.env" ]]; then
    source "$SKILL_DIR/.env"
fi
TOKEN="${CHIP_FAI_API_TOKEN:-}"
if [[ -z "$TOKEN" ]]; then
    echo "FAIL (not set)"
    EXIT_CODE=1
elif [[ ${#TOKEN} -lt 10 ]]; then
    echo "FAIL (too short)"
    EXIT_CODE=1
else
    echo "OK (${#TOKEN} chars)"
fi

# Check 8: API connectivity
echo -n "API connectivity: "
API_URL="${CHIP_FAI_API_URL:-https://chip-fai.vercel.app/api/process-image}"
if curl -sf -X OPTIONS "$API_URL" -m 5 &>/dev/null; then
    echo "OK"
else
    if curl -sf -I "$API_URL" -m 5 &>/dev/null; then
        echo "OK"
    else
        echo "WARN (cannot reach API)"
    fi
fi

# Summary
echo ""
if [[ $EXIT_CODE -eq 0 ]]; then
    echo "✅ All checks passed"
else
    echo "❌ Some checks failed"
fi

exit $EXIT_CODE
