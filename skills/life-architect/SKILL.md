---
name: life-architect
description: "Interactive psychological coach. 10 sessions for deep life transformation. Based on Dan Koe's 'How to fix your entire life in 1 day'."
metadata: {"clawdbot":{"emoji":"🧠","triggers":["/life","/architect"]}}
---

# Life Architect 🧠

## When User Says `/life`

**Step 1:** Check if intro needed
```bash
bash $CLAWD_WORKSPACE/skills/life-architect/scripts/handler.sh intro en $CLAWD_WORKSPACE
```

If `showIntro: true`, send intro message with image and "🐇 Jump into the rabbit hole" button (callback: `life:begin`).

If `showIntro: false`, run `start` and show current phase.

**Step 2:** Get current state (after intro or for returning users)
```bash
bash $CLAWD_WORKSPACE/skills/life-architect/scripts/handler.sh start en $CLAWD_WORKSPACE
```
(Use `start ru` for Russian)

**Step 3:** Parse JSON response and show to user:
```
🧠 **Life Architect** — Session {session}/10
**{title}**
Phase {phase}/{totalPhases}
━━━━━━━━━━━━━━━━━━━━━━━━━━━

{content}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

With buttons:
```json
[[{"text":"⏮ Back","callback_data":"life:prev"},{"text":"⏭ Skip","callback_data":"life:skip"}]]
```

**Step 3:** When user responds with text, save and show next:
```bash
bash $CLAWD_WORKSPACE/skills/life-architect/scripts/handler.sh save "USER_RESPONSE" $CLAWD_WORKSPACE
```

**Step 4:** Give brief acknowledgment (1-2 sentences), then show next phase content.

## Command Variants

| Command | Action |
|---------|--------|
| `/life` | Start/continue English |
| `/life ru` | Start/continue Russian |
| `/life status` | Run `handler.sh status`, show progress |
| `/life session 5` | Run `handler.sh session 5`, show that session |
| `/life reset` | Ask confirmation, then `handler.sh reset` |

## Callback Handling

When user clicks button:
- `life:prev` → `handler.sh callback life:prev`
- `life:skip` → `handler.sh callback life:skip`
- `life:lang:ru` → `handler.sh callback life:lang:ru`

## Session Completion

When `completedSessions` increments, congratulate user and offer:
```json
[[{"text":"▶️ Continue","callback_data":"life:continue"},{"text":"⏸ Break","callback_data":"life:save"}]]
```

## All 10 Complete

Run export and show final document:
```bash
bash $CLAWD_WORKSPACE/skills/life-architect/scripts/export.sh $CLAWD_WORKSPACE
```

## Notes

- Responses saved to `memory/life-architect/session-NN.md`
- State in `memory/life-architect/state.json`
- Sessions 1-10 in `references/sessions/en/` and `ru/`
- Each session has 5-6 phases
- Total: ~10 hours if done thoroughly

## Assumptions

- One response per phase (combine if user sends multiple)
- Phases are sequential within session
- jq must be installed
- No concurrent access (single user)
