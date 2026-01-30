# Backup & Restore Skill

## Description
Full backup and restore of Clawdbot configuration, skills, and workspace files. Smart memory filtering excludes files >20MB to keep archives portable.

## Triggers
- Slash command: `/backup`
- User mentions: "backup", "бэкап", "export config", "экспорт конфига"
- User mentions: "restore", "восстановить", "import config", "импорт конфига"
- User mentions: "transfer to new machine", "перенести на новый комп"

## Command
This skill is registered as `/backup` slash command via `skill.json`:
- `user-invocable: true` — exposes as `/backup`
- `command-dispatch: tool` — direct execution without model inference

## Usage

### Backup
```bash
cd $CLAWD_WORKSPACE/skills/backup-restore
./scripts/backup.sh
```

Creates timestamped archive at `$CLAWD_WORKSPACE/backups/clawd-backup-YYYYMMDD-HHMMSS.tar.gz`

Includes:
- Clawdbot config (`~/.clawdbot/clawdbot.json`)
- All skills (`$CLAWD_WORKSPACE/skills/`)
- Workspace files (AGENTS.md, USER.md, IDENTITY.md, SOUL.md, etc.)
- Memory files (all, `$CLAWD_WORKSPACE/memory/`)
- Sessions (full conversation history, `~/.clawdbot/agents/main/sessions/`)
- Cron jobs list

Excludes:
- node_modules/
- .git/
- Temporary files

### Restore
```bash
cd $CLAWD_WORKSPACE/skills/backup-restore
./scripts/restore.sh /path/to/clawd-backup-YYYYMMDD-HHMMSS.tar.gz
```

Prompts before overwriting existing files. Use `--force` to skip confirmation.

## Workflow

### When `/backup` is triggered:
1. Execute `$CLAWD_WORKSPACE/skills/backup-restore/scripts/backup.sh`
2. Parse script output to extract:
   - Archive path from line starting with `BACKUP_FILE=`
   - Size from line containing `Size: `
3. Send archive as file to owner via Telegram using `message` tool:
   ```
   message action=send channel=telegram target=YOUR_TELEGRAM_ID
           message="✅ Full backup ({size})\nIncludes: config, skills, memory, sessions, cron jobs"
           path={archive_path}
   ```
4. Reply with NO_REPLY (file message is the response)

### When user requests restore:
1. Verify archive path exists
2. Run `$CLAWD_WORKSPACE/skills/backup-restore/scripts/restore.sh <archive>`
3. Confirm restart needed → recommend `clawdbot gateway restart`

## Safety
- Always creates timestamped backups (no overwrites)
- Restore prompts before overwriting
- Memory files >20MB excluded from backup
- Config backup includes full path for easy restoration

## Dependencies
- tar (built-in)
- jq (for config parsing, optional)

## Notes
- Backup config path: `~/.clawdbot/clawdbot.json`
- Skills path: Adjust `WORKSPACE` variable in scripts
- Workspace path: Adjust `WORKSPACE` variable in scripts
- Memory path: `${WORKSPACE}/memory/`
- Backups stored: `${WORKSPACE}/backups/`

## Configuration
Edit the script variables to match your paths:
- `WORKSPACE` — your Clawdbot workspace directory
- `CONFIG_PATH` — path to clawdbot.json
- `BACKUP_DIR` — where to store backup archives
