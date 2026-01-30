#!/bin/bash
set -euo pipefail

# Clawdbot Backup Script
# Creates timestamped archive with config, skills, and workspace

# CONFIGURE THESE PATHS FOR YOUR SETUP
BACKUP_DIR="$CLAWD_WORKSPACE/backups"  # Where to store backup archives
WORKSPACE="$CLAWD_WORKSPACE"           # Clawdbot workspace directory
CONFIG_PATH="$HOME/.clawdbot/clawdbot.json"  # Config file location

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_NAME="clawd-backup-${TIMESTAMP}"
TEMP_DIR="/tmp/${BACKUP_NAME}"

echo "🦊 Clawdbot Backup Starting..."
echo "Timestamp: ${TIMESTAMP}"

# Create backup directory
mkdir -p "$BACKUP_DIR"
mkdir -p "$TEMP_DIR"

# Create structure
mkdir -p "$TEMP_DIR/config"
mkdir -p "$TEMP_DIR/skills"
mkdir -p "$TEMP_DIR/workspace"
mkdir -p "$TEMP_DIR/memory"
mkdir -p "$TEMP_DIR/sessions"

# Backup config
if [ -f "$CONFIG_PATH" ]; then
    echo "✓ Backing up config..."
    cp "$CONFIG_PATH" "$TEMP_DIR/config/"
else
    echo "⚠ Config not found at $CONFIG_PATH"
fi

# Backup skills (exclude node_modules and .git)
echo "✓ Backing up skills..."
rsync -a --exclude='node_modules' --exclude='.git' "$WORKSPACE/skills/" "$TEMP_DIR/skills/" 2>/dev/null || true

# Backup workspace files
echo "✓ Backing up workspace files..."
for file in AGENTS.md USER.md IDENTITY.md SOUL.md TOOLS.md HEARTBEAT.md SECURITY.md; do
    if [ -f "$WORKSPACE/$file" ]; then
        cp "$WORKSPACE/$file" "$TEMP_DIR/workspace/"
    fi
done

# Backup memory (all files)
echo "✓ Backing up memory..."
if [ -d "$WORKSPACE/memory" ]; then
    cp -r "$WORKSPACE/memory" "$TEMP_DIR/" 2>/dev/null || true
fi

# Backup sessions (full conversation history)
echo "✓ Backing up sessions..."
SESSIONS_PATH="$HOME/.clawdbot/agents/main/sessions"
if [ -d "$SESSIONS_PATH" ]; then
    cp -r "$SESSIONS_PATH" "$TEMP_DIR/" 2>/dev/null || true
else
    echo "⚠ Sessions not found at $SESSIONS_PATH"
fi

# Export cron jobs list
echo "✓ Exporting cron jobs..."
echo "# Clawdbot cron jobs at ${TIMESTAMP}" > "$TEMP_DIR/cron-jobs.txt"
crontab -l >> "$TEMP_DIR/cron-jobs.txt" 2>/dev/null || echo "No cron jobs found" >> "$TEMP_DIR/cron-jobs.txt"

# Create metadata
cat > "$TEMP_DIR/BACKUP_INFO.txt" << EOF
Clawdbot Backup
Created: ${TIMESTAMP}
Hostname: $(hostname)
User: $(whoami)
Workspace: ${WORKSPACE}
Config: ${CONFIG_PATH}

Contents:
- Clawdbot configuration
- All skills (excluding node_modules)
- Workspace files (AGENTS.md, USER.md, etc.)
- Memory files (all)
- Sessions (full conversation history)
- Cron jobs list

To restore:
cd $CLAWD_WORKSPACE/skills/backup-restore
./scripts/restore.sh ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz
EOF

# Create archive (compressed tar.gz)
echo "✓ Creating compressed archive..."
cd "$TEMP_DIR"

# Check if archive already exists (protection against same-second runs)
ARCHIVE_PATH="${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
if [ -f "$ARCHIVE_PATH" ]; then
    echo "⚠ Archive already exists, appending milliseconds..."
    BACKUP_NAME="${BACKUP_NAME}-$(date +%N | cut -c1-3)"
    ARCHIVE_PATH="${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
fi

tar czf "$ARCHIVE_PATH" .

# Cleanup
rm -rf "$TEMP_DIR"

# Report
ARCHIVE_SIZE=$(du -h "$ARCHIVE_PATH" | cut -f1)

echo ""
echo "✅ Backup complete!"
echo "Archive: ${ARCHIVE_PATH}"
echo "Size: ${ARCHIVE_SIZE}"
echo ""
echo "To restore on another machine:"
echo "  ./scripts/restore.sh ${ARCHIVE_PATH}"

# Output path for Clawdbot to send
echo "BACKUP_FILE=${ARCHIVE_PATH}"

# Rotate backups - keep only last 7 days
echo "✓ Rotating backups (keeping last 7 days)..."
find "$BACKUP_DIR" -name "clawd-backup-*.tar.gz" -mtime +7 -delete
echo "✓ Old backups removed"
