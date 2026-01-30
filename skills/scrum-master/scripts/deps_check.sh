#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DEPS_FILE="$ROOT_DIR/deps.lock"

if [ ! -f "$DEPS_FILE" ]; then
  echo '{"status": "error", "message": "deps.lock not found"}'
  exit 1
fi

ERRORS=()

check_version() {
  local name="$1"
  local expected="$2"
  local actual=""
  
  case "$name" in
    gog)
      if command -v gog >/dev/null 2>&1; then
        actual="$(gog --version 2>/dev/null | head -1 | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+' || echo "unknown")"
      fi
      ;;
    jq)
      if command -v jq >/dev/null 2>&1; then
        actual="$(jq --version 2>/dev/null || echo "unknown")"
      fi
      ;;
    *)
      actual="skipped"
      ;;
  esac
  
  if [ -z "$actual" ]; then
    ERRORS+=("$name: not installed (expected $expected)")
    echo "  $name: NOT INSTALLED (expected $expected)"
  elif [ "$actual" = "skipped" ]; then
    echo "  $name: skipped"
  elif [ "$actual" != "$expected" ]; then
    echo "  $name: $actual (expected $expected) - MISMATCH"
  else
    echo "  $name: $actual ✓"
  fi
}

echo "Checking dependencies from $DEPS_FILE:"
echo ""

while IFS='=' read -r name version; do
  [ -z "$name" ] && continue
  [[ "$name" =~ ^# ]] && continue
  check_version "$name" "$version"
done < "$DEPS_FILE"

echo ""

if [ ${#ERRORS[@]} -gt 0 ]; then
  jq -n \
    --arg status "error" \
    --argjson errors "$(printf '%s\n' "${ERRORS[@]}" | jq -R . | jq -s .)" \
    '{status: $status, errors: $errors}'
  exit 1
else
  jq -n '{status: "ok", message: "All critical dependencies present"}'
fi
