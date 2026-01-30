#!/bin/bash
# Shared library for scrum-master scripts
# Source this file: source "$SCRIPT_DIR/lib.sh"

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================
# All paths can be overridden via environment variables.
# Defaults are for the standard Clawdbot workspace.

CLAWD_WORKSPACE="${CLAWD_WORKSPACE:-$HOME/clawd}"
ENV_FILE="${CLAWD_ENV_FILE:-$CLAWD_WORKSPACE/.env}"
SCRUM_DATA_DIR="${SCRUM_DATA_DIR:-$CLAWD_WORKSPACE/data/scrum}"

# Load environment variables from .env
if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

# Export GOG_KEYRING_PASSWORD explicitly if present
if [ -n "${GOG_KEYRING_PASSWORD:-}" ]; then
  export GOG_KEYRING_PASSWORD
fi

# =============================================================================
# Logging
# =============================================================================

log() {
  local ts
  ts="$(date -Iseconds)"
  echo "[$ts] $*" >&2
  if [ -n "${LOG_FILE:-}" ]; then
    echo "[$ts] $*" >> "$LOG_FILE"
  fi
}

fail() {
  log "ERROR: $*"
  exit 1
}

# =============================================================================
# Dependency checks
# =============================================================================

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing command: $1"
}

require_cmds() {
  for cmd in "$@"; do
    require_cmd "$cmd"
  done
}

# =============================================================================
# gog wrappers
# =============================================================================

run_gog() {
  local out
  if ! out=$(gog "$@" 2>&1); then
    fail "gog $* failed: $out"
  fi
  printf '%s' "$out"
}

run_gog_allow_fail() {
  gog "$@" 2>&1
}

# =============================================================================
# Google Tasks helpers
# =============================================================================

get_lists_json() {
  local account="$1"
  if [ -n "$account" ]; then
    run_gog tasks lists --json --account "$account"
  else
    run_gog tasks lists --json
  fi
}

normalize_lists() {
  jq 'if type == "array" then . elif has("tasklists") then (.tasklists // []) else [] end'
}

get_list_id() {
  local lists_json="$1"
  local list_name="${LIST_NAME:-}"
  local id=""
  local lists

  lists="$(echo "$lists_json" | normalize_lists)"

  if [ -n "${LIST_ID:-}" ]; then
    echo "$LIST_ID"
    return 0
  fi

  if [ -n "$list_name" ]; then
    id=$(echo "$lists" | jq -r --arg name "$list_name" '.[] | select((.title // .name) == $name) | .id' | head -n1)
  fi

  if [ -z "$id" ]; then
    id=$(echo "$lists" | jq -r '.[0].id // empty')
  fi

  if [ -z "$id" ]; then
    fail "No task lists found"
  fi

  echo "$id"
}

normalize_tasks() {
  jq 'if type == "array" then . elif has("tasks") then (.tasks // []) else [] end'
}

fetch_tasks() {
  local list_id="$1"
  local account="${2:-}"
  shift 2 2>/dev/null || true

  if [ -n "$account" ]; then
    run_gog tasks list "$list_id" --json --account "$account" "$@"
  else
    run_gog tasks list "$list_id" --json "$@"
  fi
}

# =============================================================================
# Data file helpers
# =============================================================================

ensure_data_dir() {
  mkdir -p "$SCRUM_DATA_DIR"
}

get_data_file() {
  local name="$1"
  echo "$SCRUM_DATA_DIR/$name"
}

get_exports_dir() {
  local dir="$SCRUM_DATA_DIR/exports"
  mkdir -p "$dir"
  echo "$dir"
}
