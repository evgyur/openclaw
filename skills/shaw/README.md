# Shaw AI Coding Workflow

> Systematic prompt-based development workflow for production-quality code

Shaw is an AI coding workflow that enforces best practices through a structured 10-stage process, preventing common pitfalls like placeholder code, skipped tests, and premature commits.

## Why Shaw?

**Problem:** AI-assisted coding often produces code that "plays the role" of working software:
- Placeholder functions with TODOs
- Hardcoded values pretending to be dynamic
- Mocked tests that don't actually test anything
- Missing error handling and edge cases

**Solution:** Shaw workflow enforces quality gates at every stage, with a dedicated **LARP Assessment** checkpoint to catch fake code before it ships.

## Quick Start

```bash
# Start a new workflow
/shaw Build a REST API for task management

# Continue to next stage
/shaw go

# Check progress
/shaw status

# Jump to specific stage
/shaw p6    # LARP Assessment
```

## Workflow Stages

### 1. 📋 Plan & Research
**Goal:** Understand the task and assess complexity

- Analyze requirements
- Ask clarifying questions
- Choose complexity path (Easy/Standard/Hard)
- Create implementation plan

**Outputs:**
- Clear requirements doc
- Complexity assessment
- Route selection

---

### 2. ⚡ Implement Plan
**Goal:** Write working code without placeholders

**Rules:**
- Real code only — no TODOs or stubs
- Full error handling from the start
- No simplifications — complete implementation
- Logical chunks, not massive dumps

---

### 3. 🏃 Keep Going
**Goal:** Complete the implementation without stops

Push through to the end without waiting for approval at every step.

---

### 4. ✨ Code Quality Pass
**Goal:** Ensure code meets the 4Cs

**Criteria:**
- **Compact** — No unnecessary abstraction
- **Concise** — Clear, minimal code
- **Clean** — Consistent style, good naming
- **Capable** — Solves the actual problem

---

### 5. 🧪 Thorough Testing
**Goal:** Validate with integration tests

**Rules:**
- **No mocking** — Integration tests only
- Test real behavior, not test doubles
- Cover edge cases and error paths
- Use real file I/O, real API calls

---

### 6. ⭐ LARP Assessment
**Goal:** Detect code that's "playing a role"

**Red Flags:**
- Placeholder functions (TODO, FIXME, stub)
- Hardcoded values pretending to be dynamic
- Tests that mock the logic they're testing
- Async functions without await
- Configuration that's never read

**Question:** Is this real code or roleplay?

---

### 7. 🧹 Clean Up Slop
**Goal:** Remove AI noise and over-engineering

**Look for:**
- Debug statements (console.log, print)
- Commented-out code
- Unnecessary abstractions
- Generic variable names
- Over-engineered patterns

---

### 8. 🚀 Production Readiness
**Goal:** Deploy checklist

**Verify:**
- Error handling for all failure modes
- Input validation
- Data persistence
- Idempotency
- Documentation
- Dependencies documented
- Security (no secrets in code)
- Backward compatibility

---

### 9. 👀 Review Last Task
**Goal:** Honest self-evaluation

**Ask:**
- Does it actually work?
- Would I trust this in production?
- What corners did we cut?
- What would break at 10x scale?

---

### 10. 🔧 Fix All Issues
**Goal:** Close all outstanding work

Address everything found in the review. Don't ship with known issues.

---

## Complexity Paths

### 🟢 Easy Path (5 stages)
For simple, well-defined tasks:
```
1 Plan → 2 Implement → 3 Keep Going → 6 LARP → 0 Fix
```

### 🟡 Standard Path (10 stages)
For most features:
```
1→2→3→4→5→6→7→8→9→0
```

### 🔴 Hard Path (Iterative)
For complex, exploratory work:
```
1 Plan → 2 Implement → 3 Keep Going → 6 LARP → 0 Fix
→ (repeat with refined plan)
```

---

## State Management

Shaw uses **hybrid storage** — automatically chooses between project-local and global state:

| Context | Storage | File |
|---------|---------|------|
| Git repository | Project-local | `.shaw_state.json` |
| Outside repo | Global cache | `~/.cache/shaw/state.json` |

**Benefits:**
- Project workflows survive across sessions
- State can be committed to version control
- Works outside projects (fallback to cache)

---

## Progress Visualization

```
🥷 Shaw Workflow — Task Manager API

    Plan        Implement     KeepGoing     Quality       Testing       LARP          Cleanup       ProdReady     Review        FixAll
    [████████]  [████████]    [░░░░░░░░]    [░░░░░░░░]    [░░░░░░░░]    [░░░░░░░░]    [░░░░░░░░]    [░░░░░░░░]    [░░░░░░░░]    [░░░░░░░░]
    ✅ Done      ✅ Done       ⏳ Current    ⏹ Pending     ⏹ Pending     ⏹ Pending     ⏹ Pending     ⏹ Pending     ⏹ Pending     ⏹ Pending

Path: 🟡 STANDARD (1→2→3→4→5→6→7→8→9→0)
Started: 2026-01-30 01:50 MSK
```

---

## Stop Signals

When user input is needed, Shaw uses **bright emoji markers**:

| Emoji | Meaning | When |
|-------|---------|------|
| 🛑👇 | Decision needed | Any user choice required |
| ⚡💬 | Clarifying question | Missing information |
| 🎯✋ | Choose option | Multiple paths available |
| 🔍🤔 | Insufficient data | Blocker to continue |
| ⏳📊 | Status update | Long operation in progress |

Example:
```
🛑👇 Your decision needed

Found 3 approaches:
1. REST API — simple
2. GraphQL — flexible
3. gRPC — fast

Which one?
```

---

## Quick Commands

| Command | Action |
|---------|--------|
| `/shaw <task>` | Start new workflow |
| `/shaw go` | Continue to next stage |
| `/shaw status` | Show ASCII progress |
| `/shaw p<N>` | Jump to stage N |
| `go` | Continue (in reply) |
| `p6`, `larp` | Jump to LARP Assessment |
| `p0`, `fix` | Jump to Fix Issues |

---

## Real-World Example

**Task:** Add inbox & closet workflow to scrum-master skill

**Workflow:**
1. **Plan** → Analyzed requirements, chose Standard path
2. **Implement** → Built 4 scripts + 3 handlers (full CRUD)
3. **Keep Going** → Completed without stops
4. **Quality** → Reviewed against 4Cs, fixed quoting
5. **Testing** → Added 2 test suites (16 assertions)
6. **LARP** → Verified real file I/O, no mocks ✅
7. **Cleanup** → No TODOs, no debug statements
8. **Prod Ready** → All checklist items verified
9. **Review** → Honest gaps identified (Telegram integration)
10. **Fix** → Documented integration points

**Result:**
- ✅ 10 files created
- ✅ 1046 lines of production code
- ✅ All tests passing
- ✅ Committed and pushed
- ⏱️ Completed in ~20 minutes

---

## Integration

### With Clawdbot
Shaw is designed as an **AgentSkill** for Clawdbot:

```markdown
---
name: shaw
description: Shaw's AI Coding Workflow for production-quality code
metadata:
  clawdbot:
    emoji: 🥷
    command: /shaw
---
```

### Standalone
Can be used independently with any AI coding assistant that supports structured workflows.

---

## Philosophy

### No LARP Code
**LARP** = Live Action Role Play — code that pretends to work but doesn't.

Shaw's core insight: AI often writes code that *looks right* but:
- Uses placeholders instead of real logic
- Hardcodes test data in production paths
- Mocks away the actual complexity
- Skips error handling

The **LARP Assessment** stage catches this before shipping.

### Real Tests, Real Code
- No mocking the system under test
- Integration tests over unit tests
- Real file I/O, real API calls
- If it can't be tested for real, it's not done

### Honest Reviews
Stage 9 (Review) enforces self-critique:
- What would break at scale?
- What corners were cut?
- Would I deploy this to production?

No auto-approval — real evaluation.

---

## Requirements

- Python 3.7+ (for state manager)
- Git (optional, for project-local state)
- JSON tools (jq recommended for integration)

---

## File Structure

```
shaw/
├── SKILL.md              # Clawdbot integration + full docs
├── README.md             # This file
├── scripts/
│   └── shaw-state.py     # State manager + visualization
├── references/
│   ├── prompts.md        # Full text of all 10 prompts
│   ├── workflows.md      # Easy/Standard/Hard path details
│   └── templates.md      # Response templates
└── .shaw_state.json      # Project state (gitignored by default)
```

---

## Contributing

This is a personal workflow tool. Feel free to fork and adapt for your needs.

---

## License

Private repository — not licensed for public use.

---

## Credits

Created by [Evgeny "Chip" Yurchenko](https://github.com/evgyur)

Inspired by systematic development practices and frustration with AI-generated placeholder code.

---

## See Also

- [Clawdbot](https://github.com/clawdbot/clawdbot) — Personal AI assistant framework
- [scrum-master skill](https://github.com/evgyur/scrum-master) — Example of Shaw workflow in action
