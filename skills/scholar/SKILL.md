---
name: scholar
description: "Automated self-improvement loop for AI agents. Captures mistakes on heartbeat, injects counter-check advisories on session start, and generates weekly improvement summaries."
---

# Scholar Skill

An automated self-improvement loop that helps AI agents learn from their mistakes and avoid repeating them.

## Overview

This skill implements a continuous self-improvement cycle:

1. **Heartbeat Self-Check** — Agent asks itself 3 questions after each work session
2. **MISS Logging** — Mistakes are logged with tags and fixes
3. **Counter-Check Hook** — Advisory is injected into system prompt on session start
4. **Weekly Summary** — Aggregated improvement report sent to user

## Installation

### 1. Copy Files

```bash
# Create directories
mkdir -p ~/.clawdbot/hooks/counter-check
mkdir -p ~/clawd/.learnings
mkdir -p ~/clawd/memory

# Copy skill files
cp -r skills/scholar/* ~/clawd/skills/scholar/
cp -r hooks/counter-check/* ~/.clawdbot/hooks/counter-check/
```

### 2. Initialize Learnings Log

```bash
cp assets/LEARNINGS.md ~/clawd/.learnings/LEARNINGS.md
```

### 3. Update HEARTBEAT.md

Add the Self-Check section from `assets/HEARTBEAT-SECTION.md` to your workspace `HEARTBEAT.md`.

### 4. Enable Hook

```bash
clawdbot hooks enable counter-check
clawdbot gateway restart
```

### 5. Create Weekly Cron

```bash
# Via Clawdbot chat or API
cron action=add job='{"name":"weekly-scholar","enabled":true,"schedule":{"kind":"cron","expr":"0 21 * * 0","tz":"Your/Timezone"},"sessionTarget":"main","wakeMode":"now","payload":{"kind":"systemEvent","text":"..."}}'
```

See `assets/weekly-cron.json` for the full payload.

## Components

### HEARTBEAT.md Self-Check Section

Add to your `HEARTBEAT.md`:

```markdown
## Self-Check (on every heartbeat with prior session activity)

Before responding to heartbeat, ask yourself these questions about recent work:

1. **Confidence check**: What sounded right but went nowhere? Where did I default to consensus without verifying?
2. **Speed check**: Did I add noise instead of signal? What didn't move the task forward?
3. **Depth check**: What assumption did I not pressure-test? What did I accept without questioning?

### If you find a MISS:

Log to `.learnings/LEARNINGS.md` using this format:

## [LRN-YYYYMMDD-XXX] self_review

**Logged**: ISO-8601 timestamp
**Tag**: confidence | uncertainty | speed | depth
**Status**: pending

### MISS
[What went wrong - be specific]

### FIX
[Concrete action to prevent this in future]

### Context
[Task/conversation where this occurred]

---
```

### Counter-Check Hook

Located in `hooks/counter-check/`. This hook:

1. Listens for `agent:bootstrap` events
2. Parses `.learnings/LEARNINGS.md` for recent pending entries
3. Injects a `COUNTER_CHECK.md` advisory into the system prompt
4. Syncs learnings to `memory/learnings.md` for search indexing

### Learnings Log Format

```markdown
## [LRN-YYYYMMDD-XXX] category

**Logged**: 2026-01-30T12:00:00Z
**Tag**: confidence | uncertainty | speed | depth
**Status**: pending | applied | wont_fix

### MISS
What went wrong or suboptimal

### FIX
Concrete action to prevent recurrence

### Context
Task or situation where this occurred

---
```

**Tags:**
- `confidence` — Defaulted to consensus without verification
- `uncertainty` — Failed to acknowledge unknowns
- `speed` — Added noise instead of signal
- `depth` — Didn't pressure-test assumptions

**Status:**
- `pending` — Not yet addressed
- `applied` — Fix has been implemented
- `wont_fix` — Decided not to address (with reason)

### Weekly Summary Cron

Runs every Sunday at 21:00 (configurable). Generates a report:

```
📊 Scholar: week [date]

**Statistics:**
• Total MISS: X
• Fixed: Y
• Common tag: [tag]

**Top patterns:**
1. [description] — occurred N times
2. ...

**Focus for next week:**
• [specific action]
```

## How It Works

### The Loop

```
Heartbeat Poll
     │
     ▼
┌────────────────────────────────────┐
│ Read HEARTBEAT.md                  │
│ → Find Self-Check section          │
│ → Ask 3 questions                  │
└────────────────────────────────────┘
     │
     ├── Found MISS ──────────────────────────┐
     │                                        ▼
     │                           ┌────────────────────────────┐
     │                           │ Append to                  │
     │                           │ .learnings/LEARNINGS.md    │
     │                           └────────────────────────────┘
     │                                        │
     ▼                                        ▼
┌────────────────────────────────────────────────────────────┐
│ Continue with heartbeat response                           │
└────────────────────────────────────────────────────────────┘

Next Session Start
     │
     ▼
┌────────────────────────────────────────────────────────────┐
│ counter-check hook fires                                   │
│ → Parse .learnings/LEARNINGS.md                            │
│ → Find pending entries from last 7 days                    │
│ → Inject COUNTER_CHECK.md into bootstrap files             │
│ → Sync to memory/learnings.md for search                   │
└────────────────────────────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────────────────────────┐
│ Agent sees advisory in system prompt                       │
│ → Aware of recent mistakes                                 │
│ → More careful in overlapping contexts                     │
└────────────────────────────────────────────────────────────┘
```

### Memory Search Integration

The hook syncs `.learnings/LEARNINGS.md` to `memory/learnings.md` on every session start. This enables:

- `memory_search` finds relevant past mistakes by context
- Agent can proactively check before similar tasks
- Weekly summary can query by date range

## Configuration

### Adjust Check Frequency

The self-check runs on every heartbeat with prior session activity. To change:

- Edit the heartbeat interval in Clawdbot config
- Or add conditions to HEARTBEAT.md (e.g., "only if session had errors")

### Customize Tags

Edit the Tag field options in HEARTBEAT.md and SKILL.md to match your workflow.

### Change Summary Schedule

Update the cron expression:
- `0 21 * * 0` — Sunday 21:00
- `0 9 * * 1` — Monday 09:00
- `0 18 * * 5` — Friday 18:00

## Best Practices

1. **Be specific in MISS** — "Assumed X without checking" not "Made a mistake"
2. **Make FIX actionable** — "Always verify Y before Z" not "Be more careful"
3. **Include context** — Future you needs to understand when this applies
4. **Review weekly** — The summary is useless if you don't read it
5. **Mark applied** — Update status when you've internalized the fix

## Troubleshooting

### Hook not firing

```bash
clawdbot hooks check
clawdbot hooks info counter-check
```

Verify the hook is enabled and the handler path is correct.

### Memory search not finding entries

```bash
clawdbot memory status
clawdbot memory index
```

Ensure `memory/learnings.md` exists and is indexed.

### Weekly cron not running

```bash
# Check cron status
cron action=list

# Verify job exists and is enabled
# Check nextRunAtMs is in the future
```

## License

Private — for personal use only.
