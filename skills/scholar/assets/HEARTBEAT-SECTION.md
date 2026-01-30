## Self-Check (on every heartbeat with prior session activity)

Before responding to heartbeat, ask yourself these questions about recent work:

1. **Confidence check**: What sounded right but went nowhere? Where did I default to consensus without verifying?
2. **Speed check**: Did I add noise instead of signal? What didn't move the task forward?
3. **Depth check**: What assumption did I not pressure-test? What did I accept without questioning?

### If you find a MISS:

Log to `.learnings/LEARNINGS.md` using this format:

```markdown
## [LRN-YYYYMMDD-XXX] self_review

**Logged**: 2026-01-30T12:00:00Z
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

Generate XXX as sequential number (001, 002...) or random 3 chars (A7B).

### If no MISS found:
Continue with normal heartbeat response. Do not log "nothing found".

---

## Counter-Check (advisory)

On session start, if working on a task that overlaps with recent MISS tags in `.learnings/LEARNINGS.md`:

1. Run `memory_search` for relevant entries
2. If match found, show advisory: `⚠️ Previous MISS in similar context: [summary]. Double-check before proceeding.`
3. This is advisory only — proceed with task, but be more careful
