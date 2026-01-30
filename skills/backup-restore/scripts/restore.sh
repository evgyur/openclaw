#!/bin/bash
set -euo pipefail

# Clawdbot Restore Script
# Restores configuration, skills, and workspace from backup archive

# CONFIGURE THESE PATHS FOR YOUR SETUP
WORKSPACE="$CLAWD_WORKSPACE"    # Clawdbot workspace directory
CONFIG_DIR="$HOME/.clawdbot"     # Config directory

FORCE=false

# Parse arguments
if [ $# -lt 1 ]; then
    echo "Usage: $0 <backup-archive.tar.gz> [--force]"
    echo ""
    echo "Example:"
    echo "  $0 $CLAWD_WORKSPACE/backups/clawd-backup-20260126-204400.tar.gz"
    exit 1
fi

ARCHIVE_PATH="$1"

if [ $# -gt 1 ] && [ "$2" == "--force" ]; then
    FORCE=true
fi

# Validate archive
if [ ! -f "$ARCHIVE_PATH" ]; then
    echo "❌ Archive not found: $ARCHIVE_PATH"
    exit 1
fi

TEMP_DIR="/tmp/clawd-restore-$$"
mkdir -p "$TEMP_DIR"

echo "🦊 Clawdbot Restore Starting..."
echo "Archive: $ARCHIVE_PATH"
echo ""

# Extract archive
echo "✓ Extracting archive..."
tar xzf "$ARCHIVE_PATH" -C "$TEMP_DIR"

# Show backup info
if [ -f "$TEMP_DIR/BACKUP_INFO.txt" ]; then
    echo ""
    cat "$TEMP_DIR/BACKUP_INFO.txt"
    echo ""
fi

# Confirmation prompt
if [ "$FORCE" != true ]; then
    echo "⚠️  This will overwrite:"
    echo "  - Config: $CONFIG_DIR/clawdbot.json"
    echo "  - Skills: $WORKSPACE/skills/"
    echo "  - Workspace files: $WORKSPACE/{AGENTS.md,USER.md,etc.}"
    echo "  - Memory: $WORKSPACE/memory/"
    echo ""
    read -p "Continue? [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        rm -rf "$TEMP_DIR"
        exit 0
    fi
fi

# Restore config
if [ -f "$TEMP_DIR/config/clawdbot.json" ]; then
    echo "✓ Restoring config..."
    mkdir -p "$CONFIG_DIR"
    cp "$TEMP_DIR/config/clawdbot.json" "$CONFIG_DIR/"
else
    echo "⚠ No config found in backup"
fi

# Restore skills
if [ -d "$TEMP_DIR/skills" ]; then
    echo "✓ Restoring skills..."
    mkdir -p "$WORKSPACE/skills"
    rsync -a "$TEMP_DIR/skills/" "$WORKSPACE/skills/"
else
    echo "⚠ No skills found in backup"
fi

# Restore workspace files
if [ -d "$TEMP_DIR/workspace" ]; then
    echo "✓ Restoring workspace files..."
    for file in "$TEMP_DIR/workspace"/*; do
        if [ -f "$file" ]; then
            cp "$file" "$WORKSPACE/"
        fi
    done
else
    echo "⚠ No workspace files found in backup"
fi

# Restore memory
if [ -d "$TEMP_DIR/memory" ]; then
    echo "✓ Restoring memory..."
    mkdir -p "$WORKSPACE/memory"
    rsync -a "$TEMP_DIR/memory/" "$WORKSPACE/memory/"
else
    echo "⚠ No memory files found in backup"
fi

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo "✅ Restore complete!"
echo ""
echo "Next steps:"
echo "1. Review restored config: $CONFIG_DIR/clawdbot.json"
echo "2. Restart Clawdbot: clawdbot gateway restart"
echo "3. Check status: clawdbot gateway status"
echo ""
echo "Note: Cron jobs not auto-restored (see cron-jobs.txt in archive for reference)"
