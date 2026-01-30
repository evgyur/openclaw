# Clawdbot Backup & Restore

Full backup and restore solution for transferring Clawdbot configuration between machines.

🦊 Clawdbot skill for creating portable backups of your entire configuration, skills, and workspace.

## Features
- 📦 One-command backup via `/backup` slash command
- 🚀 Smart filtering (excludes files >20MB from memory)
- 📤 Auto-send backup file to owner via Telegram
- 🔧 Easy restore on new machines
- ⚡ Timestamped archives (no overwrites)

## Installation

```bash
cd /path/to/clawdbot/workspace/skills
git clone https://github.com/evgyur/clawd-backup.git backup-restore
cd backup-restore
chmod +x scripts/*.sh

# Edit paths in scripts
nano scripts/backup.sh   # Set WORKSPACE, CONFIG_PATH, BACKUP_DIR
nano scripts/restore.sh  # Set WORKSPACE, CONFIG_DIR

# Restart Clawdbot to register /backup command
clawdbot gateway restart
```

## Quick Start

### Create Backup
```bash
cd $CLAWD_WORKSPACE/skills/backup-restore
./scripts/backup.sh
```

Output: `$CLAWD_WORKSPACE/backups/clawd-backup-YYYYMMDD-HHMMSS.tar.gz`

### Restore Backup
```bash
cd $CLAWD_WORKSPACE/skills/backup-restore
./scripts/restore.sh /path/to/backup.tar.gz
```

Prompts before overwriting. Use `--force` to skip.

## What's Included

### Backed Up
- ✅ Clawdbot config (`~/.clawdbot/clawdbot.json`)
- ✅ All skills (excluding node_modules)
- ✅ Workspace files (AGENTS.md, USER.md, IDENTITY.md, SOUL.md, etc.)
- ✅ Memory files <20MB
- ✅ Cron jobs list (for reference)

### Excluded
- ❌ node_modules/
- ❌ .git/
- ❌ Memory files >20MB
- ❌ Temp files

## Configuration

Before first use, edit script paths:

```bash
# In scripts/backup.sh and scripts/restore.sh
WORKSPACE="/path/to/your/workspace"
CONFIG_PATH="$HOME/.clawdbot/clawdbot.json"
BACKUP_DIR="/path/to/your/workspace/backups"
```

## Transfer to New Machine

1. **On old machine:**
   ```bash
   ./scripts/backup.sh
   # Copy archive to new machine via scp/rsync/usb
   ```

2. **On new machine:**
   ```bash
   # Install Clawdbot first
   npm install -g clawdbot
   
   # Clone this skill
   cd /path/to/clawdbot/workspace/skills
   git clone https://github.com/YOUR_USERNAME/clawd-backup.git backup-restore
   
   # Edit script paths
   nano backup-restore/scripts/backup.sh
   nano backup-restore/scripts/restore.sh
   
   # Restore
   cd backup-restore
   ./scripts/restore.sh /path/to/backup.tar.gz
   
   # Restart
   clawdbot gateway restart
   ```

3. **After restore:**
   - Review config: `~/.clawdbot/clawdbot.json`
   - Check status: `clawdbot gateway status`
   - Manually set up cron jobs (see cron-jobs.txt in archive)

## Memory Filtering

Memory files >20MB are automatically excluded to keep archives portable. This prevents huge media/cache files from bloating backups.

To include specific large files, manually copy them after restore.

## Safety

- Timestamped archives (no overwrites)
- Restore prompts before overwriting
- `--force` flag for automated restore
- Temp directories cleaned up automatically

## Automation

Add to cron for automatic backups:
```bash
0 3 * * * $CLAWD_WORKSPACE/skills/backup-restore/scripts/backup.sh
```

## Troubleshooting

**Archive too large?**
- Check memory/ folder for large files
- Archives exclude >20MB files automatically

**Restore fails?**
- Ensure Clawdbot is installed (`clawdbot --version`)
- Check archive integrity: `tar tzf backup.tar.gz`
- Run with `--force` to skip prompts

**Missing files after restore?**
- Check BACKUP_INFO.txt in archive for contents
- Large memory files (>20MB) are excluded by design
