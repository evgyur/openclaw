# Scholar Skill

Automated self-improvement loop for AI agents. Captures mistakes on heartbeat, injects counter-check advisories on session start, and generates weekly improvement summaries.

## Quick Start

```bash
# 1. Copy hook to Clawdbot hooks directory
cp -r hooks/counter-check ~/.clawdbot/hooks/

# 2. Initialize learnings log in your workspace
mkdir -p ~/clawd/.learnings
cp assets/LEARNINGS.md ~/clawd/.learnings/

# 3. Add self-check section to HEARTBEAT.md
cat assets/HEARTBEAT-SECTION.md >> ~/clawd/HEARTBEAT.md

# 4. Enable hook and restart
clawdbot hooks enable counter-check
clawdbot gateway restart

# 5. Create weekly summary cron (via chat)
# Send: cron action=add job=<contents of assets/weekly-cron.json>
```

## What It Does

1. **Heartbeat** — Agent asks 3 self-check questions
2. **MISS detected** — Logs to `.learnings/LEARNINGS.md` with tag and fix
3. **New session** — Hook injects advisory showing recent mistakes
4. **Weekly** — Summary report sent to user

## Structure

```
scholar/
├── SKILL.md              # Full documentation
├── README.md             # This file
├── assets/
│   ├── LEARNINGS.md      # Template for learnings log
│   ├── HEARTBEAT-SECTION.md  # Section to add to HEARTBEAT.md
│   └── weekly-cron.json  # Cron job definition
└── hooks/
    └── counter-check/
        ├── HOOK.md       # Hook metadata
        └── handler.ts    # Hook implementation
```

## License

Private — personal use only.
